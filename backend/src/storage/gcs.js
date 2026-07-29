import { Storage } from '@google-cloud/storage';
import { StorageProvider } from './provider.js';

export class GCSStorageProvider extends StorageProvider {
  constructor() {
    super('gcp');
    
    const projectId = process.env.GCP_PROJECT_ID;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = process.env.GCP_PRIVATE_KEY;
    
    // Check if we have inline credentials or a key file path
    if (projectId && clientEmail && privateKey) {
      // Decode private key if it's base64 encoded or escaped
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      this.storage = new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: formattedPrivateKey
        }
      });
      this.enabled = true;
    } else if (projectId && process.env.GCP_KEY_FILE) {
      this.storage = new Storage({
        projectId,
        keyFilename: process.env.GCP_KEY_FILE
      });
      this.enabled = true;
    } else {
      this.enabled = false;
    }
  }

  async uploadChunk(bucketName, path, buffer) {
    if (!this.enabled) {
      throw new Error('Google Cloud Storage credentials not configured');
    }

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(path);
    
    await file.save(buffer, {
      resumable: false, // small chunks, no need for resumable upload session
      contentType: 'application/octet-stream'
    });
  }

  async downloadChunk(bucketName, path) {
    if (!this.enabled) {
      throw new Error('Google Cloud Storage credentials not configured');
    }

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(path);
    
    const [content] = await file.download();
    return content;
  }

  async deleteChunk(bucketName, path) {
    if (!this.enabled) {
      throw new Error('Google Cloud Storage credentials not configured');
    }

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(path);
    
    // ignore if not found
    try {
      await file.delete();
    } catch (err) {
      if (err.code !== 404) {
        throw err;
      }
    }
  }

  async checkHealth() {
    if (!this.enabled) return false;
    try {
      // Attempt to list buckets or get project meta
      await this.storage.getBuckets({ maxResults: 1 });
      return true;
    } catch (err) {
      console.error('GCP Storage health check failed:', err.message);
      return false;
    }
  }
}
