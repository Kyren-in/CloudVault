import { Router } from 'express';
import multer from 'multer';
import { signup, login } from '../controllers/auth.js';
import { uploadFile, downloadFile, deleteFile, listFiles, getStorageStats, toggleProviderHealth } from '../controllers/files.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Multer in-memory storage config (limit single uploads to 100MB for testing safety)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

// Authentication routes
router.post('/signup', signup);
router.post('/login', login);

// File management routes (Token protected)
router.post('/upload', authenticateToken, upload.single('file'), uploadFile);
router.get('/files', authenticateToken, listFiles);
router.get('/download/:id', authenticateToken, downloadFile);
router.delete('/files/:id', authenticateToken, deleteFile);
router.delete('/file/:id', authenticateToken, deleteFile); // Aliased delete endpoint

// Storage details & Health routing
router.get('/storage', authenticateToken, getStorageStats);
router.post('/storage/health/toggle', authenticateToken, toggleProviderHealth);

export default router;
