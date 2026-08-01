import { prisma } from '../config/db.js';
import { storageManager } from '../storage/manager.js';
import { simulatedHealthStatus } from '../storage/local.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'local_storage', 'temp_uploads');
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB as defined in the PRD

function isValidHash(hash) {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash);
}

function isValidFileContent(buffer, filename) {
  if (buffer.length < 2) return true;
  
  // 1. Block PE Executables (MZ header)
  if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return false;
  }
  
  // 2. Block ELF binaries
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return false;
  }

  // 3. Block Java Class files
  if (buffer.length >= 4 && buffer[0] === 0xCA && buffer[1] === 0xFE && buffer[2] === 0xBA && buffer[3] === 0xBE) {
    return false;
  }

  // 4. Block plaintext script files (PHP, HTML, Bash scripts)
  const textSample = buffer.slice(0, 1000).toString('utf-8');
  if (
    textSample.includes('<?php') || 
    textSample.includes('<script') || 
    textSample.includes('#!/bin/sh') || 
    textSample.includes('#!/bin/bash')
  ) {
    return false;
  }

  return true;
}

/**
 * Initiates a chunked upload.
 * Checks for deduplication (instant upload) and scans for already uploaded chunks to support resume.
 */
export async function initiateUpload(req, res) {
  try {
    const { filename, size, hash } = req.body;
    if (!filename || !size || !hash) {
      return res.status(400).json({ error: 'Missing filename, size, or hash parameter.' });
    }
    if (!isValidHash(hash)) {
      return res.status(400).json({ error: 'Invalid file hash format.' });
    }

    const userId = req.userId;

    // --- INSTANT UPLOAD DEDUPLICATION ---
    // If a file with the exact same SHA-256 hash already exists in the system,
    // we match it and complete the upload instantly, saving storage and network bandwidth.
    const existingFile = await prisma.file.findFirst({
      where: { hash },
      include: { chunks: true }
    });

    if (existingFile) {
      const file = await prisma.file.create({
        data: {
          userId,
          filename,
          size,
          hash,
          encrypted: existingFile.encrypted,
          compression: existingFile.compression,
          encryptionKey: existingFile.encryptionKey,
          iv: existingFile.iv,
          chunks: {
            create: existingFile.chunks.map(c => ({
              chunkNumber: c.chunkNumber,
              provider: c.provider,
              bucket: c.bucket,
              path: c.path,
              hash: c.hash,
              size: c.size
            }))
          }
        }
      });

      return res.status(200).json({
        exists: true,
        message: 'File matched via deduplication hash. Upload completed instantly!',
        file: {
          id: file.id,
          filename: file.filename,
          size: file.size,
          createdAt: file.createdAt,
          chunksCount: existingFile.chunks.length,
          compression: file.compression
        }
      });
    }

    // --- SETUP RESUME DIRECTORY ---
    const uploadPath = path.join(UPLOADS_DIR, hash);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Scan directory for existing chunks
    const files = fs.readdirSync(uploadPath);
    const uploadedChunks = files
      .filter(f => f.startsWith('chunk_'))
      .map(f => Number(f.split('_')[1]));

    res.json({
      exists: false,
      uploadId: hash,
      uploadedChunks
    });
  } catch (err) {
    console.error('Initiate upload error:', err);
    res.status(500).json({ error: 'Failed to initiate file upload.' });
  }
}

/**
 * Handles uploading an individual chunk. Verifies hash and saves to temp folder.
 */
export async function uploadChunk(req, res) {
  try {
    const { uploadId, chunkNumber, chunkHash } = req.body;
    if (!uploadId || !chunkNumber || !chunkHash || !req.file) {
      return res.status(400).json({ error: 'Missing uploadId, chunkNumber, chunkHash, or file.' });
    }
    if (!isValidHash(uploadId) || !isValidHash(chunkHash)) {
      return res.status(400).json({ error: 'Invalid identifier format.' });
    }

    const buffer = req.file.buffer;

    // Verify chunk integrity
    const calculatedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (calculatedHash !== chunkHash) {
      return res.status(400).json({ error: `Chunk hash mismatch. Expected ${chunkHash}, got ${calculatedHash}` });
    }

    const uploadPath = path.join(UPLOADS_DIR, uploadId);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const chunkFilePath = path.join(uploadPath, `chunk_${chunkNumber}`);
    fs.writeFileSync(chunkFilePath, buffer);

    res.json({
      success: true,
      chunkNumber: Number(chunkNumber)
    });
  } catch (err) {
    console.error('Upload chunk error:', err);
    res.status(500).json({ error: 'Failed to upload file chunk.' });
  }
}

/**
 * Finalizes chunked upload. Merges chunks, validates file, Brotli compresses, GCM encrypts, and uploads.
 */
export async function finalizeUpload(req, res) {
  const { uploadId, filename, size, hash } = req.body;
  const userId = req.userId;

  if (!uploadId || !filename || !size || !hash) {
    return res.status(400).json({ error: 'Missing parameters to finalize upload.' });
  }
  if (!isValidHash(uploadId) || !isValidHash(hash)) {
    return res.status(400).json({ error: 'Invalid identifier format.' });
  }

  const uploadPath = path.join(UPLOADS_DIR, uploadId);
  if (!fs.existsSync(uploadPath)) {
    return res.status(400).json({ error: 'Upload session not found. Please initiate upload again.' });
  }

  try {
    // Read and merge chunks in order
    const expectedChunks = Math.ceil(size / CHUNK_SIZE);
    const chunkBuffers = [];

    for (let i = 1; i <= expectedChunks; i++) {
      const chunkFilePath = path.join(uploadPath, `chunk_${i}`);
      if (!fs.existsSync(chunkFilePath)) {
        return res.status(400).json({ error: `Missing chunk #${i}. Please retry uploading.` });
      }
      chunkBuffers.push(fs.readFileSync(chunkFilePath));
    }

    const mergedBuffer = Buffer.concat(chunkBuffers);

    // Verify final file size and SHA-256 hash
    if (mergedBuffer.length !== size) {
      return res.status(400).json({ error: `File size mismatch. Expected ${size} bytes, merged ${mergedBuffer.length} bytes.` });
    }

    const calculatedHash = crypto.createHash('sha256').update(mergedBuffer).digest('hex');
    if (calculatedHash !== hash) {
      return res.status(400).json({ error: `File integrity hash mismatch. Merged SHA-256 is ${calculatedHash}` });
    }

    // Run malicious script/PE injection blocker
    if (!isValidFileContent(mergedBuffer, filename)) {
      return res.status(400).json({ error: 'Unsupported file type or malicious script content detected.' });
    }

    // Call storageManager to compress, encrypt, split and distribute chunks across cloud outposts
    const uploadResult = await storageManager.uploadFile(mergedBuffer, filename);

    // Save metadata in database
    const file = await prisma.file.create({
      data: {
        userId,
        filename: uploadResult.filename,
        size: uploadResult.size,
        hash: uploadResult.hash,
        encrypted: uploadResult.encrypted,
        compression: uploadResult.compression,
        encryptionKey: uploadResult.encryptionKey,
        iv: uploadResult.iv,
        chunks: {
          create: uploadResult.chunks.map(chunk => ({
            chunkNumber: chunk.chunkNumber,
            provider: chunk.provider,
            bucket: chunk.bucket,
            path: chunk.path,
            hash: chunk.hash,
            size: chunk.size
          }))
        }
      },
      include: {
        chunks: true
      }
    });

    // Async cleanup of temp folder
    fs.rm(uploadPath, { recursive: true, force: true }, (err) => {
      if (err) console.error('Failed to clean up temp upload folder:', err.message);
    });

    res.status(201).json({
      message: 'File successfully merged, encrypted, and distributed across clouds.',
      file: {
        id: file.id,
        filename: file.filename,
        size: file.size,
        createdAt: file.createdAt,
        chunksCount: file.chunks.length,
        compression: file.compression
      }
    });
  } catch (err) {
    console.error('Finalize upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to merge and secure upload.' });
  }
}

/**
 * Aborts an upload session and purges any temporary chunks uploaded so far.
 */
export async function cancelUpload(req, res) {
  try {
    const { uploadId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ error: 'Missing uploadId parameter.' });
    }
    if (!isValidHash(uploadId)) {
      return res.status(400).json({ error: 'Invalid upload session identifier format.' });
    }

    const uploadPath = path.join(UPLOADS_DIR, uploadId);
    if (fs.existsSync(uploadPath)) {
      fs.rmSync(uploadPath, { recursive: true, force: true });
    }

    res.json({ message: 'Upload session cancelled and temporary cache cleared.' });
  } catch (err) {
    console.error('Cancel upload error:', err);
    res.status(500).json({ error: 'Failed to cancel upload.' });
  }
}

/**
 * Uploads a file (fallback endpoint).
 */
export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const { buffer, originalname } = req.file;
    const userId = req.userId;

    if (!isValidFileContent(buffer, originalname)) {
      return res.status(400).json({ error: 'Unsupported file type or malicious content detected.' });
    }

    const uploadResult = await storageManager.uploadFile(buffer, originalname);

    const file = await prisma.file.create({
      data: {
        userId,
        filename: uploadResult.filename,
        size: uploadResult.size,
        hash: uploadResult.hash,
        encrypted: uploadResult.encrypted,
        compression: uploadResult.compression,
        encryptionKey: uploadResult.encryptionKey,
        iv: uploadResult.iv,
        chunks: {
          create: uploadResult.chunks.map(chunk => ({
            chunkNumber: chunk.chunkNumber,
            provider: chunk.provider,
            bucket: chunk.bucket,
            path: chunk.path,
            hash: chunk.hash,
            size: chunk.size
          }))
        }
      },
      include: {
        chunks: true
      }
    });

    res.status(201).json({
      message: 'File successfully uploaded and distributed across clouds.',
      file: {
        id: file.id,
        filename: file.filename,
        size: file.size,
        createdAt: file.createdAt,
        chunksCount: file.chunks.length,
        compression: file.compression
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Error processing file upload.' });
  }
}

/**
 * Downloads a file. Pulls chunks (with auto-failover), merges, decrypts, decompresses, and streams it back.
 */
export async function downloadFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const file = await prisma.file.findUnique({
      where: { id },
      include: { chunks: true }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // Verify permission (admin can read files too)
    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (file.userId !== userId && requestingUser?.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to access this file.' });
    }

    const decryptedBuffer = await storageManager.downloadFile(file);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    res.send(decryptedBuffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: err.message || 'Error processing file download.' });
  }
}

/**
 * Deletes a file. Cleans up chunks from cloud providers and deletes database metadata.
 */
export async function deleteFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const file = await prisma.file.findUnique({
      where: { id },
      include: { chunks: true }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (file.userId !== userId && requestingUser?.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this file.' });
    }

    await storageManager.deleteFile(file);

    await prisma.file.delete({
      where: { id }
    });

    res.json({ message: 'File and its cloud replicas/chunks deleted successfully.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Error deleting file.' });
  }
}

/**
 * Lists all uploaded files for the authenticated user.
 */
export async function listFiles(req, res) {
  try {
    const userId = req.userId;

    const files = await prisma.file.findMany({
      where: { userId },
      include: {
        chunks: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const filesPayload = files.map(file => ({
      id: file.id,
      filename: file.filename,
      size: file.size,
      createdAt: file.createdAt,
      compression: file.compression,
      encrypted: file.encrypted,
      chunks: file.chunks.map(c => ({
        id: c.id,
        chunkNumber: c.chunkNumber,
        provider: c.provider,
        size: c.size
      }))
    }));

    res.json(filesPayload);
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Error listing files.' });
  }
}

/**
 * Returns overall storage usage and health statuses of cloud providers.
 */
export async function getStorageStats(req, res) {
  try {
    const userId = req.userId;

    const files = await prisma.file.findMany({
      where: { userId },
      include: { chunks: true }
    });

    let totalOriginalSize = 0;
    let totalCloudSize = 0;
    
    const distribution = {};
    for (const key of Object.keys(storageManager.providers)) {
      distribution[key] = 0;
    }

    for (const file of files) {
      totalOriginalSize += file.size;
      for (const chunk of file.chunks) {
        totalCloudSize += chunk.size;
        if (distribution[chunk.provider] !== undefined) {
          distribution[chunk.provider]++;
        } else {
          distribution[chunk.provider] = 1;
        }
      }
    }

    const providerStatus = await storageManager.getProvidersStatus();

    res.json({
      storageUsed: {
        originalBytes: totalOriginalSize,
        cloudBytes: totalCloudSize,
        savingsBytes: Math.max(0, totalOriginalSize - totalCloudSize)
      },
      distribution,
      providers: providerStatus
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Error retrieving storage stats.' });
  }
}

/**
 * Toggles the online/offline simulated state of a provider.
 */
export async function toggleProviderHealth(req, res) {
  try {
    const { provider } = req.body;
    
    if (!storageManager.providers[provider]) {
      return res.status(400).json({ error: `Provider '${provider}' is not configured.` });
    }

    if (simulatedHealthStatus[provider]) {
      simulatedHealthStatus[provider].online = !simulatedHealthStatus[provider].online;
    } else {
      const currentHealth = await storageManager.providers[provider].checkHealth();
      simulatedHealthStatus[provider] = { online: !currentHealth, latency: 80 };
    }

    const currentStatus = await storageManager.getProvidersStatus();
    res.json({
      message: `Simulated state for ${provider.toUpperCase()} toggled.`,
      providers: currentStatus
    });
  } catch (err) {
    console.error('Toggle health error:', err);
    res.status(500).json({ error: 'Failed to toggle simulated provider health.' });
  }
}
