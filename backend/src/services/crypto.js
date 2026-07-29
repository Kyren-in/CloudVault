import crypto from 'crypto';
import zlib from 'zlib';

/**
 * Generates a random 256-bit AES key in hex format.
 */
export function generateFileKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculates the SHA-256 hash of a buffer.
 */
export function calculateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compresses a buffer using GZIP.
 */
export function compress(buffer, algorithm = 'gzip') {
  if (algorithm === 'gzip') {
    return zlib.gzipSync(buffer);
  }
  return buffer; // fall through for 'none'
}

/**
 * Decompresses a buffer using GZIP.
 */
export function decompress(buffer, algorithm = 'gzip') {
  if (algorithm === 'gzip') {
    return zlib.gunzipSync(buffer);
  }
  return buffer;
}

/**
 * Encrypts a buffer using AES-256-GCM.
 * Appends the 16-byte GCM authentication tag to the end of the ciphertext buffer.
 */
export function encrypt(buffer, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12); // GCM standard IV is 12 bytes
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag(); // 16 bytes
  
  // Combine encrypted data and tag
  const encryptedPayload = Buffer.concat([encrypted, tag]);
  
  return {
    encryptedBuffer: encryptedPayload,
    iv: iv.toString('hex')
  };
}

/**
 * Decrypts a buffer using AES-256-GCM.
 * Extracts the 16-byte tag from the end of the buffer.
 */
export function decrypt(encryptedPayload, keyHex, ivHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  
  // Extract ciphertext and tag
  const tagLength = 16;
  const cipherText = encryptedPayload.subarray(0, encryptedPayload.length - tagLength);
  const tag = encryptedPayload.subarray(encryptedPayload.length - tagLength);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  return Buffer.concat([
    decipher.update(cipherText),
    decipher.final()
  ]);
}
