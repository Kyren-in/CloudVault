import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cloudvault-super-secret-key-12345';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found. Please log in again.' });
      }

      if (user.isSuspended) {
        return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
      }

      req.userId = decoded.userId;
      next();
    } catch (dbErr) {
      console.error('Middleware database check failed:', dbErr.message);
      res.status(500).json({ error: 'Server authentication database error.' });
    }
  });
}
