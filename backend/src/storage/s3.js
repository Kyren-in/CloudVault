import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { StorageProvider } from './provider.js';

export class S3StorageProvider extends StorageProvider {
  constructor(name = 'aws', config = {}) {
    super(name);
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    const endpoint = config.endpoint || process.env.AWS_ENDPOINT;
    
    // Initialize if keys are present
    if (accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: this.region,
        endpoint: endpoint || undefined, // Support custom endpoints (Backblaze B2, Cloudflare R2, Supabase)
        forcePathStyle: true,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });
      this.enabled = true;
    } else {
      this.enabled = false;
    }
  }

  async uploadChunk(bucket, path, buffer) {
    if (!this.enabled) {
      throw new Error('AWS S3 credentials not configured');
    }
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: buffer
    });
    
    await this.client.send(command);
  }

  async downloadChunk(bucket, path) {
    if (!this.enabled) {
      throw new Error('AWS S3 credentials not configured');
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: path
    });

    const response = await this.client.send(command);
    
    // Convert stream to Buffer
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async deleteChunk(bucket, path) {
    if (!this.enabled) {
      throw new Error('AWS S3 credentials not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: path
    });

    await this.client.send(command);
  }

  async checkHealth() {
    if (!this.enabled) return false;
    try {
      const key = this.name.toUpperCase();
      const bucket = process.env[`${key}_BUCKET_NAME`] || process.env.CLOUD_BUCKET_NAME || 'cloudvault-bucket';
      
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 1
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      console.error(`S3 health check failed for ${this.name}:`, err.message);
      return false;
    }
  }
}
