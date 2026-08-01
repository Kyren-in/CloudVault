import { Router } from 'express';
import multer from 'multer';
import { 
  signup, login, forgotPassword, resetPassword, 
  sendOtp, getSessions, logoutSession, logoutAllSessions, refreshToken,
  getAdminUsers, suspendUser, getEmailLogs, getAuditLogs
} from '../controllers/auth.js';
import { 
  uploadFile, downloadFile, deleteFile, listFiles, getStorageStats, toggleProviderHealth,
  initiateUpload, uploadChunk, finalizeUpload, cancelUpload
} from '../controllers/files.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Multer in-memory storage config
// Allow chunk uploads up to 15MB for safe buffer boundaries
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

// Authentication & OTP routes
router.post('/auth/send-otp', sendOtp);
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Session management
router.get('/auth/sessions', authenticateToken, getSessions);
router.delete('/auth/sessions/:id', authenticateToken, logoutSession);
router.delete('/auth/sessions', authenticateToken, logoutAllSessions);
router.post('/auth/refresh-token', refreshToken);

// File management routes (Token protected)
router.get('/files', authenticateToken, listFiles);
router.get('/download/:id', authenticateToken, downloadFile);
router.delete('/files/:id', authenticateToken, deleteFile);
router.delete('/file/:id', authenticateToken, deleteFile); // Aliased delete endpoint

// High-speed parallel chunk upload routes
router.post('/upload/initiate', authenticateToken, initiateUpload);
router.post('/upload/chunk', authenticateToken, upload.single('file'), uploadChunk);
router.post('/upload/finalize', authenticateToken, finalizeUpload);
router.post('/upload/cancel', authenticateToken, cancelUpload);

// Storage details & Health routing
router.get('/storage', authenticateToken, getStorageStats);
router.post('/storage/health/toggle', authenticateToken, toggleProviderHealth);

// Admin controls
router.get('/admin/users', authenticateToken, getAdminUsers);
router.post('/admin/users/:id/suspend', authenticateToken, suspendUser);
router.get('/admin/email-logs', authenticateToken, getEmailLogs);
router.get('/admin/audit-logs', authenticateToken, getAuditLogs);

export default router;
