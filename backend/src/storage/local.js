import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StorageProvider } from './provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory health and latency status that can be toggled via backend controller
export const simulatedHealthStatus = {
  aws: { online: true, latency: 120 },
  gcp: { online: true, latency: 90 },
  backblaze: { online: true, latency: 150 },
  cloudflare: { online: true, latency: 70 },
  supabase: { online: true, latency: 180 },
  oracle: { online: true, latency: 110 }
};

export class LocalFileStorageProvider extends StorageProvider {
  constructor(name) {
    super(name);
    // Determine local storage directory e.g., backend/local_storage/aws
    this.storageDir = path.join(__dirname, '..', '..', 'local_storage', name);
    this.initStorage();
  }

  initStorage() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  // Helper to simulate latency
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isOnline() {
    return simulatedHealthStatus[this.name]?.online !== false;
  }

  getLatency() {
    return simulatedHealthStatus[this.name]?.latency || 50;
  }

  async uploadChunk(bucket, chunkPath, buffer) {
    await this.delay(this.getLatency());
    
    if (!this.isOnline()) {
      throw new Error(`Storage Provider ${this.name.toUpperCase()} is offline (Simulated)`);
    }

    const fullPath = path.join(this.storageDir, bucket, chunkPath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, buffer);
  }

  async downloadChunk(bucket, chunkPath) {
    await this.delay(this.getLatency());

    if (!this.isOnline()) {
      throw new Error(`Storage Provider ${this.name.toUpperCase()} is offline (Simulated)`);
    }

    const fullPath = path.join(this.storageDir, bucket, chunkPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Chunk file not found: ${chunkPath} at ${this.name}`);
    }

    return fs.readFileSync(fullPath);
  }

  async deleteChunk(bucket, chunkPath) {
    await this.delay(this.getLatency() / 2);

    if (!this.isOnline()) {
      throw new Error(`Storage Provider ${this.name.toUpperCase()} is offline (Simulated)`);
    }

    const fullPath = path.join(this.storageDir, bucket, chunkPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async checkHealth() {
    // Return mock health state
    return this.isOnline();
  }
}
