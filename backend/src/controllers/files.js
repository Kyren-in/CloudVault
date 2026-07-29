import { prisma } from '../config/db.js';
import { storageManager } from '../storage/manager.js';
import { simulatedHealthStatus } from '../storage/local.js';

/**
 * Uploads a file. Compresses, encrypts, chunks, uploads to cloud, and records in database.
 */
export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const { buffer, originalname } = req.file;
    const userId = req.userId;

    // Upload via storage manager
    const uploadResult = await storageManager.uploadFile(buffer, originalname);

    // Save in database
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

    // Find file and its chunks
    const file = await prisma.file.findUnique({
      where: { id },
      include: { chunks: true }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    if (file.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to access this file.' });
    }

    // Download, merge, decrypt, decompress
    const decryptedBuffer = await storageManager.downloadFile(file);

    // Send original file
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

    if (file.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this file.' });
    }

    // Delete chunks from providers
    await storageManager.deleteFile(file);

    // Delete from DB
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

    // Simplify payload for client
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

    // Get files to compute storage
    const files = await prisma.file.findMany({
      where: { userId },
      include: { chunks: true }
    });

    let totalOriginalSize = 0;
    let totalCloudSize = 0;
    let awsChunksCount = 0;
    let gcpChunksCount = 0;

    for (const file of files) {
      totalOriginalSize += file.size;
      for (const chunk of file.chunks) {
        totalCloudSize += chunk.size;
        if (chunk.provider === 'aws') awsChunksCount++;
        if (chunk.provider === 'gcp') gcpChunksCount++;
      }
    }

    // Fetch live health & latency status from storage manager
    const providerStatus = await storageManager.getProvidersStatus();

    res.json({
      storageUsed: {
        originalBytes: totalOriginalSize,
        cloudBytes: totalCloudSize,
        savingsBytes: Math.max(0, totalOriginalSize - totalCloudSize)
      },
      distribution: {
        awsChunks: awsChunksCount,
        gcpChunks: gcpChunksCount
      },
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
    const { provider } = req.body; // 'aws' or 'gcp'
    
    if (provider !== 'aws' && provider !== 'gcp') {
      return res.status(400).json({ error: "Provider must be 'aws' or 'gcp'" });
    }

    if (simulatedHealthStatus[provider]) {
      simulatedHealthStatus[provider].online = !simulatedHealthStatus[provider].online;
    } else {
      simulatedHealthStatus[provider] = { online: false, latency: 100 };
    }

    const currentStatus = await storageManager.getProvidersStatus();
    res.json({
      message: `Simulated state for ${provider.toUpperCase()} toggled to ${simulatedHealthStatus[provider].online ? 'ONLINE' : 'OFFLINE'}.`,
      providers: currentStatus
    });
  } catch (err) {
    console.error('Toggle health error:', err);
    res.status(500).json({ error: 'Failed to toggle simulated provider health.' });
  }
}
