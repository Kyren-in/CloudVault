import { LocalFileStorageProvider, simulatedHealthStatus } from './local.js';
import { S3StorageProvider } from './s3.js';
import { GCSStorageProvider } from './gcs.js';
import * as cryptoService from '../services/crypto.js';

// Configuration thresholds (lowered for easier testing, can be set via env)
const CHUNK_THRESHOLD_MB = Number(process.env.CHUNK_THRESHOLD_MB) || 10;
const CHUNK_SIZE_MB = Number(process.env.CHUNK_SIZE_MB) || 5;

const CHUNK_THRESHOLD_BYTES = CHUNK_THRESHOLD_MB * 1024 * 1024;
const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;

class StorageManager {
  constructor() {
    this.providers = {};
    this.initProviders();
  }

  initProviders() {
    const useMock = process.env.USE_MOCK_STORAGE !== 'false';

    if (useMock) {
      console.log('CloudVault is running in OFFLINE MOCK STORAGE mode.');
      this.providers.aws = new LocalFileStorageProvider('aws');
      this.providers.gcp = new LocalFileStorageProvider('gcp');
    } else {
      console.log('CloudVault is running in PRODUCTION CLOUD STORAGE mode.');
      
      const s3 = new S3StorageProvider();
      this.providers.aws = s3.enabled ? s3 : new LocalFileStorageProvider('aws');

      // GCP node can be configured with standard GCS OR a second S3-compatible client (e.g. Supabase Storage / Cloudflare R2)
      const gcs = new GCSStorageProvider();
      if (gcs.enabled) {
        this.providers.gcp = gcs;
      } else if (process.env.GCP_S3_ACCESS_KEY_ID && process.env.GCP_S3_SECRET_ACCESS_KEY) {
        console.log('Injecting S3-compatible client for GCP node...');
        const secondaryS3 = new S3StorageProvider('gcp', {
          region: process.env.GCP_S3_REGION || 'us-east-1',
          endpoint: process.env.GCP_S3_ENDPOINT,
          accessKeyId: process.env.GCP_S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.GCP_S3_SECRET_ACCESS_KEY
        });
        this.providers.gcp = secondaryS3.enabled ? secondaryS3 : new LocalFileStorageProvider('gcp');
      } else {
        this.providers.gcp = new LocalFileStorageProvider('gcp');
      }
    }
  }

  /**
   * Retrieves active providers and their health statuses
   */
  async getProvidersStatus() {
    const statuses = {};
    for (const [key, provider] of Object.entries(this.providers)) {
      const isOnline = await provider.checkHealth();
      
      // Determine latency (mock is simulated, real can measure request duration)
      let latency = 50;
      if (provider instanceof LocalFileStorageProvider) {
        latency = provider.getLatency();
      } else {
        const start = Date.now();
        await provider.checkHealth();
        latency = Date.now() - start;
      }

      statuses[key] = {
        name: key === 'aws' ? 'AWS S3' : 'Google Cloud Storage',
        type: key,
        online: isOnline,
        latency: isOnline ? latency : 0,
        isMock: provider instanceof LocalFileStorageProvider
      };
    }
    return statuses;
  }

  /**
   * Uploads a file: compresses, encrypts, chunks (if needed), and replicates/distributes.
   * @param {Buffer} fileBuffer - The original uncompressed file buffer.
   * @param {string} filename - Name of the file.
   * @returns {Promise<object>} - Metadata to store in the DB.
   */
  async uploadFile(fileBuffer, filename) {
    const originalSize = fileBuffer.length;
    const originalHash = cryptoService.calculateHash(fileBuffer);

    // 1. Compress
    const compressed = cryptoService.compress(fileBuffer, 'gzip');

    // 2. Encrypt
    const fileKey = cryptoService.generateFileKey();
    const { encryptedBuffer, iv } = cryptoService.encrypt(compressed, fileKey);
    const encryptedSize = encryptedBuffer.length;

    // Check which providers are online
    const awsOnline = await this.providers.aws.checkHealth();
    const gcpOnline = await this.providers.gcp.checkHealth();

    if (!awsOnline && !gcpOnline) {
      throw new Error('All storage providers are currently offline. Cannot complete upload.');
    }

    const bucketName = process.env.CLOUD_BUCKET_NAME || 'cloudvault-bucket';
    const chunkRecords = [];

    // Decide strategy based on size
    if (encryptedSize < CHUNK_THRESHOLD_BYTES) {
      // SMALL FILE STRATEGY: Replicate full file to both providers
      console.log(`Uploading ${filename} (<${CHUNK_THRESHOLD_MB}MB) using replication strategy.`);
      const chunkPath = `files/${originalHash}/full.enc`;
      
      const uploadPromises = [];
      
      if (awsOnline) {
        uploadPromises.push((async () => {
          await this.providers.aws.uploadChunk(bucketName, chunkPath, encryptedBuffer);
          chunkRecords.push({
            chunkNumber: 1,
            provider: 'aws',
            bucket: bucketName,
            path: chunkPath,
            hash: cryptoService.calculateHash(encryptedBuffer),
            size: encryptedSize
          });
        })());
      }
      
      if (gcpOnline) {
        uploadPromises.push((async () => {
          await this.providers.gcp.uploadChunk(bucketName, chunkPath, encryptedBuffer);
          chunkRecords.push({
            chunkNumber: 1,
            provider: 'gcp',
            bucket: bucketName,
            path: chunkPath,
            hash: cryptoService.calculateHash(encryptedBuffer),
            size: encryptedSize
          });
        })());
      }

      await Promise.all(uploadPromises);
    } else {
      // LARGE FILE STRATEGY: Distribute chunks round-robin
      console.log(`Uploading ${filename} (>=${CHUNK_THRESHOLD_MB}MB) using chunked distribution strategy.`);
      
      const numChunks = Math.ceil(encryptedSize / CHUNK_SIZE_BYTES);
      const activeProviders = [];
      if (awsOnline) activeProviders.push('aws');
      if (gcpOnline) activeProviders.push('gcp');

      const chunkUploadPromises = [];

      for (let i = 0; i < numChunks; i++) {
        const start = i * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, encryptedSize);
        const chunkBuffer = encryptedBuffer.subarray(start, end);
        const chunkHash = cryptoService.calculateHash(chunkBuffer);
        const chunkNumber = i + 1;
        const chunkPath = `files/${originalHash}/chunk_${chunkNumber}.enc`;

        // Round robin selection among active providers
        const providerName = activeProviders[i % activeProviders.length];
        const provider = this.providers[providerName];

        chunkUploadPromises.push((async () => {
          await provider.uploadChunk(bucketName, chunkPath, chunkBuffer);
          chunkRecords.push({
            chunkNumber,
            provider: providerName,
            bucket: bucketName,
            path: chunkPath,
            hash: chunkHash,
            size: chunkBuffer.length
          });
        })());
      }

      await Promise.all(chunkUploadPromises);
    }

    return {
      filename,
      size: originalSize,
      hash: originalHash,
      encrypted: true,
      compression: 'gzip',
      encryptionKey: fileKey,
      iv,
      chunks: chunkRecords
    };
  }

  /**
   * Downloads a file: retrieves chunks, merges them, decrypts, and decompresses.
   * Handles failover automatically if a provider is offline for replicated files.
   * @param {object} fileMetadata - File metadata from DB including relations to chunks.
   * @returns {Promise<Buffer>} - The original decrypted/decompressed file buffer.
   */
  async downloadFile(fileMetadata) {
    const { chunks, encryptionKey, iv, compression, filename } = fileMetadata;
    
    // Sort chunks by chunk number
    const sortedChunks = [...chunks].sort((a, b) => a.chunkNumber - b.chunkNumber);
    
    // Group chunks by chunkNumber to check for replicas (small files have multiple replicas for chunkNumber=1)
    const chunkGroups = {};
    for (const chunk of sortedChunks) {
      if (!chunkGroups[chunk.chunkNumber]) {
        chunkGroups[chunk.chunkNumber] = [];
      }
      chunkGroups[chunk.chunkNumber].push(chunk);
    }

    const downloadedChunkBuffers = [];
    const totalChunkNumbers = Object.keys(chunkGroups).length;

    // Check online status of providers
    const awsOnline = await this.providers.aws.checkHealth();
    const gcpOnline = await this.providers.gcp.checkHealth();

    for (let chunkNumber = 1; chunkNumber <= totalChunkNumbers; chunkNumber++) {
      const replicas = chunkGroups[chunkNumber];
      if (!replicas || replicas.length === 0) {
        throw new Error(`Missing chunk #${chunkNumber} reference for file ${filename}`);
      }

      let chunkBuffer = null;
      let lastError = null;

      // Try downloading from the replicas. Try online providers first.
      // Sort replicas: place online providers first
      const sortedReplicas = [...replicas].sort((a, b) => {
        const aOnline = a.provider === 'aws' ? awsOnline : gcpOnline;
        const bOnline = b.provider === 'aws' ? awsOnline : gcpOnline;
        return bOnline - aOnline; // true (1) before false (0)
      });

      for (const replica of sortedReplicas) {
        try {
          const provider = this.providers[replica.provider];
          console.log(`Downloading chunk #${chunkNumber} from ${replica.provider}...`);
          const buffer = await provider.downloadChunk(replica.bucket, replica.path);
          
          // Verify integrity hash
          const downloadedHash = cryptoService.calculateHash(buffer);
          if (downloadedHash !== replica.hash) {
            throw new Error(`Integrity check failed for chunk #${chunkNumber} from ${replica.provider}`);
          }

          chunkBuffer = buffer;
          break; // successfully downloaded, exit replica loop
        } catch (err) {
          console.warn(`Failed to download chunk #${chunkNumber} from ${replica.provider}:`, err.message);
          lastError = err;
        }
      }

      if (!chunkBuffer) {
        throw new Error(`Unable to retrieve chunk #${chunkNumber} from any provider. Last error: ${lastError?.message}`);
      }

      downloadedChunkBuffers.push(chunkBuffer);
    }

    // 1. Merge
    const encryptedPayload = Buffer.concat(downloadedChunkBuffers);

    // 2. Decrypt
    const compressed = cryptoService.decrypt(encryptedPayload, encryptionKey, iv);

    // 3. Decompress
    return cryptoService.decompress(compressed, compression);
  }

  /**
   * Deletes a file's chunks from the cloud providers.
   * @param {object} fileMetadata - File metadata from DB including relations to chunks.
   */
  async deleteFile(fileMetadata) {
    const { chunks } = fileMetadata;
    const deletePromises = [];

    for (const chunk of chunks) {
      const provider = this.providers[chunk.provider];
      deletePromises.push(
        provider.deleteChunk(chunk.bucket, chunk.path).catch(err => {
          console.error(`Failed to delete chunk from ${chunk.provider}:`, err.message);
        })
      );
    }

    await Promise.all(deletePromises);
  }
}

export const storageManager = new StorageManager();
