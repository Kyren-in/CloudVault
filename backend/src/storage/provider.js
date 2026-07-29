/**
 * Abstract interface for cloud storage providers.
 */
export class StorageProvider {
  constructor(name) {
    this.name = name; // 'aws', 'gcp', or 'local'
  }

  /**
   * Uploads a chunk of data.
   * @param {string} bucket - Target bucket name.
   * @param {string} path - Target path or key.
   * @param {Buffer} buffer - Chunk data.
   * @returns {Promise<void>}
   */
  async uploadChunk(bucket, path, buffer) {
    throw new Error('Method uploadChunk must be implemented');
  }

  /**
   * Downloads a chunk of data.
   * @param {string} bucket - Target bucket name.
   * @param {string} path - Target path or key.
   * @returns {Promise<Buffer>} - Decoded chunk data.
   */
  async downloadChunk(bucket, path) {
    throw new Error('Method downloadChunk must be implemented');
  }

  /**
   * Deletes a chunk of data.
   * @param {string} bucket - Target bucket name.
   * @param {string} path - Target path or key.
   * @returns {Promise<void>}
   */
  async deleteChunk(bucket, path) {
    throw new Error('Method deleteChunk must be implemented');
  }

  /**
   * Verifies connectivity and credentials for the provider.
   * @returns {Promise<boolean>} - True if healthy, false if offline.
   */
  async checkHealth() {
    throw new Error('Method checkHealth must be implemented');
  }
}
