import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cloudvault-super-secret-key-12345';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    
    req.userId = decoded.userId;
    next();
  });
}
