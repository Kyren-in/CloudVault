import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'cloudvault-super-secret-key-12345';
const AUDIT_LOG_PATH = path.join(process.cwd(), 'auth_audit.log');

// HTML tag detector pattern to prevent injections (replaces silent cleaning with immediate rejection)
const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

// Audit logger for security monitoring
function logAuditFailure(action, req, errorDetails, payload) {
  const timestamp = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Redact confidential fields in payload
  const redactedPayload = { ...payload };
  if (redactedPayload.password) redactedPayload.password = '[REDACTED]';
  if (redactedPayload.newPassword) redactedPayload.newPassword = '[REDACTED]';
  if (redactedPayload.token) redactedPayload.token = '[REDACTED]';

  const logEntry = JSON.stringify({
    timestamp,
    ip,
    action,
    error: errorDetails,
    payload: redactedPayload
  });

  console.warn(`[AUTH AUDIT FAILURE] ${logEntry}`);
  
  try {
    fs.appendFileSync(AUDIT_LOG_PATH, logEntry + '\n');
  } catch (err) {
    console.error('Failed to write to auth audit log file:', err);
  }
}

// Zod Validation Schemas
const freeTextSchema = z.string()
  .min(2, 'Must be at least 2 characters')
  .max(100, 'Must be under 100 characters')
  .refine(val => !HTML_TAG_PATTERN.test(val), {
    message: 'HTML/Script tags are not allowed'
  });

const emailSchema = z.string()
  .email('Must be a valid email format')
  .max(100, 'Email must be under 100 characters')
  .refine(val => !HTML_TAG_PATTERN.test(val), {
    message: 'HTML/Script tags are not allowed in email'
  });

const passwordSchema = z.string()
  .min(8, 'Must be at least 8 characters')
  .max(100, 'Must be under 100 characters')
  .refine(val => !HTML_TAG_PATTERN.test(val), {
    message: 'HTML/Script tags are not allowed in password'
  });

const tokenSchema = z.string()
  .min(10, 'Token is too short')
  .max(1000, 'Token is too long')
  .refine(val => !HTML_TAG_PATTERN.test(val), {
    message: 'HTML/Script tags are not allowed in token'
  });

const signupSchema = z.object({
  name: freeTextSchema,
  email: emailSchema,
  password: passwordSchema
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

const forgotPasswordSchema = z.object({
  email: emailSchema
});

const resetPasswordSchema = z.object({
  token: tokenSchema,
  newPassword: passwordSchema
});

export async function signup(req, res) {
  try {
    // 1. Audit and Validate request body via Zod
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      logAuditFailure('signup', req, result.error.errors, req.body);
      return res.status(400).json({ error: 'Invalid credentials or request data.' });
    }

    const { name, email, password } = result.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      logAuditFailure('signup', req, 'Email already exists', { name, email });
      // Keep it generic to avoid email enumeration
      return res.status(400).json({ error: 'Invalid credentials or request data.' });
    }

    // Hash password asynchronously
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword
      }
    });

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Database or server error during signup.' });
  }
}

export async function login(req, res) {
  try {
    // 1. Audit and Validate request body via Zod
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      logAuditFailure('login', req, result.error.errors, req.body);
      return res.status(400).json({ error: 'Invalid credentials or request data.' });
    }

    const { email, password } = result.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      logAuditFailure('login', req, 'User not found', { email });
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Compare passwords
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logAuditFailure('login', req, 'Password mismatch', { email });
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database or server error during login.' });
  }
}

export async function forgotPassword(req, res) {
  try {
    // 1. Audit and Validate request body via Zod
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      logAuditFailure('forgotPassword', req, result.error.errors, req.body);
      return res.status(400).json({ error: 'Invalid credentials or request data.' });
    }

    const { email } = result.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      logAuditFailure('forgotPassword', req, 'Email not registered', { email });
      return res.json({ message: 'If that email exists in our system, we have sent reset instructions.' });
    }

    const secret = JWT_SECRET + user.password;
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '15m' });

    console.log(`\n==================================================`);
    console.log(`🔑 PASSWORD RESET REQUEST RECEIVED`);
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Reset Token: ${token}`);
    console.log(`Reset URL: http://localhost:5173/?resetToken=${token}`);
    console.log(`==================================================\n`);

    const responsePayload = {
      message: 'Password reset instructions have been generated. Check server console logs.'
    };

    if (process.env.NODE_ENV !== 'production' || process.env.USE_MOCK_STORAGE !== 'false') {
      responsePayload.resetToken = token;
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error during forgot password processing.' });
  }
}

export async function resetPassword(req, res) {
  try {
    // 1. Audit and Validate request body via Zod
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      logAuditFailure('resetPassword', req, result.error.errors, req.body);
      return res.status(400).json({ error: 'Invalid credentials or request data.' });
    }

    const { token, newPassword } = result.data;

    const decoded = jwt.decode(token);
    if (!decoded || !decoded.userId) {
      logAuditFailure('resetPassword', req, 'Malformed reset token decoded payload', { token });
      return res.status(400).json({ error: 'Invalid or malformed reset token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      logAuditFailure('resetPassword', req, 'User ID in token does not exist', { userId: decoded.userId });
      return res.status(404).json({ error: 'User not found.' });
    }

    const secret = JWT_SECRET + user.password;
    try {
      jwt.verify(token, secret);
    } catch (err) {
      logAuditFailure('resetPassword', req, 'JWT signature verify failed', { token });
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error during password reset execution.' });
  }
}
