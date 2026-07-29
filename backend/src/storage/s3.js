import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { StorageProvider } from './provider.js';

export class S3StorageProvider extends StorageProvider {
  constructor() {
    super('aws');
    this.region = process.env.AWS_REGION || 'us-east-1';
    
    // Initialize if keys are present
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
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
      // List buckets is a simple check to see if credentials and connection work
      const command = new ListBucketsCommand({});
      await this.client.send(command);
      return true;
    } catch (err) {
      console.error('AWS S3 health check failed:', err.message);
      return false;
    }
  }
}
