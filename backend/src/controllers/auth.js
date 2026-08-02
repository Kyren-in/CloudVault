import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  sendOtpEmail, sendWelcomeEmail, 
  sendResetPasswordEmail, sendLockoutEmail 
} from '../services/email.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cloudvault-super-secret-key-12345';
const AUDIT_LOG_PATH = path.join(process.cwd(), 'auth_audit.log');

// In-Memory storage for brute-force tracking
const ipAttempts = new Map();      // IP -> { count, resetTime }
const accountAttempts = new Map(); // Email -> { count, lockUntil }

// HTML tag detector pattern to prevent injections
const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

// Disposable Email Domains Blacklist
const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'yopmail.com', 'tempmail.com', 'throwawaymail.com',
  '10minutemail.com', 'sharklasers.com', 'guerrillamail.com', 'dispostable.com',
  'getairmail.com', 'maildrop.cc', 'temp-mail.org'
];

function isDisposableEmail(email) {
  const domain = email.toLowerCase().split('@')[1];
  return DISPOSABLE_DOMAINS.includes(domain);
}

// Helper to record audit failures
function logAuditFailure(action, req, errorDetails, payload) {
  const timestamp = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
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

// IP rate limit validator
function checkIpRateLimit(ip) {
  const now = Date.now();
  let record = ipAttempts.get(ip);
  
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + 60 * 1000 };
    ipAttempts.set(ip, record);
    return true;
  }

  record.count += 1;
  return record.count <= 30; // Limit at 30 attempts per minute
}

// Account lockout manager
function getAccountRecord(email) {
  const key = email.toLowerCase();
  let record = accountAttempts.get(key);
  const now = Date.now();

  if (!record) {
    record = { count: 0, lockUntil: 0 };
    accountAttempts.set(key, record);
  }

  if (record.lockUntil && now > record.lockUntil) {
    record.count = 0;
    record.lockUntil = 0;
  }

  return record;
}

function recordAccountFailure(email) {
  const record = getAccountRecord(email);
  record.count += 1;
  
  if (record.count >= 6) {
    record.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
    sendLockoutEmail(email.toLowerCase()).catch(err => console.error('Lockout email err:', err.message));
  }
}

function recordAccountSuccess(email) {
  accountAttempts.delete(email.toLowerCase());
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
  password: passwordSchema,
  code: z.string().length(6, 'Verification code must be 6 digits')
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

// --- CONTROLLER FUNCTIONS ---

/**
 * Sends a registration verification OTP code to the requested email.
 */
export async function sendOtp(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    if (!checkIpRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    }

    const { email } = req.body;
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const targetEmail = result.data.toLowerCase();

    // 1. Blacklist disposable domains
    if (isDisposableEmail(targetEmail)) {
      return res.status(400).json({ error: 'Disposable email domains are not allowed.' });
    }

    // 2. Prevent duplicate emails
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    // 3. Enforce 60 seconds resend rate limiting per email
    const recentOtp = await prisma.verificationOtp.findFirst({
      where: {
        email: targetEmail,
        createdAt: {
          gt: new Date(Date.now() - 60 * 1000)
        }
      }
    });
    if (recentOtp) {
      return res.status(429).json({ error: 'Please wait 60 seconds before requesting a new OTP.' });
    }

    // 4. Generate random 6 digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save in database
    await prisma.verificationOtp.create({
      data: {
        email: targetEmail,
        code,
        expiresAt
      }
    });

    // Send email
    await sendOtpEmail(targetEmail, code);

    const payload = { message: 'Verification OTP sent successfully.' };
    
    // Developer helper bypass for testing convenience
    if (process.env.NODE_ENV !== 'production' || process.env.USE_MOCK_STORAGE !== 'false') {
      payload.otp = code;
    }

    res.json(payload);
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification code.' });
  }
}

/**
 * Registers a new user, verifying the OTP first.
 */
export async function signup(req, res) {
  try {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      logAuditFailure('signup', req, result.error.errors, req.body);
      return res.status(400).json({ error: result.error.errors[0]?.message || 'Invalid registration details.' });
    }

    const { name, email, password, code } = result.data;
    const targetEmail = email.toLowerCase();

    // Verify OTP
    const otpRecord = await prisma.verificationOtp.findFirst({
      where: { email: targetEmail },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired or is invalid.' });
    }

    if (otpRecord.code !== code) {
      // Increment attempts
      const updatedOtp = await prisma.verificationOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } }
      });

      if (updatedOtp.attempts >= 5) {
        await prisma.verificationOtp.delete({ where: { id: otpRecord.id } });
        return res.status(400).json({ error: 'Maximum attempts exceeded. Please request a new OTP.' });
      }

      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // OTP Verified! Delete it.
    await prisma.verificationOtp.delete({ where: { id: otpRecord.id } });

    // Verify user doesn't already exist (double check)
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    // Hash password with cost factor 12
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    // Only the specified email address is allowed to become an admin, all other signups are regular users
    const role = targetEmail.toLowerCase() === '2605804@kiit.ac.in' ? 'admin' : 'user';

    const user = await prisma.user.create({
      data: {
        name,
        email: targetEmail,
        password: hashedPassword,
        role
      }
    });

    // Send Welcome Email
    await sendWelcomeEmail(targetEmail, name).catch(e => console.error('Welcome email err:', e.message));

    // Generate JWT access (15 minutes) and refresh (7 days) tokens
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: '7d' });

    // Store Session in DB
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: req.headers['user-agent'] || 'Unknown Device',
        ipAddress: ip
      }
    });

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Database or server error during signup.' });
  }
}

/**
 * Logs in a user, validates lockout, and stores active device session logs.
 */
export async function login(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let emailInput = req.body?.email || 'unknown';

  try {
    if (!checkIpRateLimit(ip)) {
      logAuditFailure('login_rate_limit_ip', req, 'IP address rate-limited', { email: emailInput });
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }

    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      logAuditFailure('login', req, result.error.errors, req.body);
      return res.status(400).json({ error: 'Incorrect email or password' });
    }

    const { email, password } = result.data;
    emailInput = email;

    // Check Account Lockout
    const account = getAccountRecord(email);
    const now = Date.now();

    if (account.lockUntil && now < account.lockUntil) {
      account.lockUntil = now + 15 * 60 * 1000;
      logAuditFailure('login_account_locked', req, 'Attempt on locked account.', { email });
      return res.status(403).json({ error: 'Your account is locked due to multiple failed attempts. Try again in 15 minutes.' });
    }

    // Adaptive penalty delay
    if (account.count >= 2) {
      const delay = Math.min(10000, (account.count - 1) * 1000);
      await new Promise(r => setTimeout(r, delay));
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      recordAccountFailure(email);
      logAuditFailure('login', req, 'User not found', { email });
      return res.status(400).json({ error: 'Incorrect email or password' });
    }

    // Check suspension
    if (user.isSuspended) {
      logAuditFailure('login_suspended', req, 'Attempted login to suspended account', { email });
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      recordAccountFailure(email);
      logAuditFailure('login', req, 'Password mismatch', { email });
      return res.status(400).json({ error: 'Incorrect email or password' });
    }

    // Clear failures
    recordAccountSuccess(email);

    // Generate JWT access (15 minutes) and refresh (7 days) tokens
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: '7d' });

    // Store Session in DB
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: req.headers['user-agent'] || 'Unknown Device',
        ipAddress: ip
      }
    });

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
}

/**
 * Uses a refresh token to generate a new short-lived access token.
 */
export async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    // Check session in DB
    const session = await prisma.session.findUnique({
      where: { refreshToken }
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Verify JWT signature
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      
      // Update last active on session
      await prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() }
      });

      // Generate new access token
      const token = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '15m' });
      res.json({ token });
    } catch (jwtErr) {
      // Token signature invalid or expired. Delete session.
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Server error during token refresh.' });
  }
}

/**
 * Lists all active sessions for the current user.
 */
export async function getSessions(req, res) {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.userId },
      orderBy: { lastUsedAt: 'desc' }
    });

    res.json(sessions.map(s => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      isCurrent: s.refreshToken === (req.body?.refreshToken || '')
    })));
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Failed to retrieve active sessions.' });
  }
}

/**
 * Revokes a specific session (locks out that device).
 */
export async function logoutSession(req, res) {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session || session.userId !== req.userId) {
      return res.status(454).json({ error: 'Session not found or unauthorized.' });
    }

    await prisma.session.delete({
      where: { id }
    });

    res.json({ message: 'Device session revoked successfully.' });
  } catch (err) {
    console.error('Revoke session error:', err);
    res.status(500).json({ error: 'Failed to revoke device session.' });
  }
}

/**
 * Revokes all sessions for the current user (locks out all devices).
 */
export async function logoutAllSessions(req, res) {
  try {
    await prisma.session.deleteMany({
      where: { userId: req.userId }
    });
    res.json({ message: 'Successfully logged out from all other devices.' });
  } catch (err) {
    console.error('Logout all sessions error:', err);
    res.status(500).json({ error: 'Failed to terminate all sessions.' });
  }
}

/**
 * Sends a password reset email link with secure tokens.
 */
export async function forgotPassword(req, res) {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      logAuditFailure('forgotPassword', req, result.error.errors, req.body);
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const { email } = result.data;
    const targetEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: targetEmail }
    });

    if (!user) {
      logAuditFailure('forgotPassword', req, 'Email not registered', { email });
      return res.json({ message: "If that email is registered, you'll receive a reset link" });
    }

    // Token includes password hash in secret to support single-use
    const secret = JWT_SECRET + user.password;
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '15m' });
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/?resetToken=${token}`;

    // Send email
    await sendResetPasswordEmail(targetEmail, user.name, resetUrl);

    const responsePayload = {
      message: "If that email is registered, you'll receive a reset link"
    };

    if (process.env.NODE_ENV !== 'production' || process.env.USE_MOCK_STORAGE !== 'false') {
      responsePayload.resetToken = token;
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error during forgot password.' });
  }
}

/**
 * Resets the password using a valid token and clears all active sessions.
 */
export async function resetPassword(req, res) {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      logAuditFailure('resetPassword', req, result.error.errors, req.body);
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const { token, newPassword } = result.data;

    const decoded = jwt.decode(token);
    if (!decoded || !decoded.userId) {
      logAuditFailure('resetPassword', req, 'Malformed reset token', { token });
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      logAuditFailure('resetPassword', req, 'User in token not found', { userId: decoded.userId });
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const secret = JWT_SECRET + user.password;
    try {
      jwt.verify(token, secret);
    } catch (err) {
      logAuditFailure('resetPassword', req, 'JWT signature verify failed', { token });
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    // Hash new password with cost factor 12
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Invalidate all active sessions (Force re-login on all devices)
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
}

// --- ADMIN AUDITING CONTROLLERS ---

/**
 * Helper middleware or check to confirm user is admin
 */
async function checkAdmin(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user && user.role === 'admin';
}

/**
 * List all users with their statistics (for Admin panel).
 */
export async function getAdminUsers(req, res) {
  try {
    if (!(await checkAdmin(req.userId))) {
      return res.status(403).json({ error: 'Admin permission required.' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        files: {
          select: {
            size: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const userPayload = users.map(u => {
      const fileCount = u.files.length;
      const totalSize = u.files.reduce((sum, f) => sum + f.size, 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt,
        fileCount,
        totalSize
      };
    });

    res.json(userPayload);
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Failed to retrieve user list.' });
  }
}

/**
 * Suspends or unsuspends a user account.
 */
export async function suspendUser(req, res) {
  try {
    if (!(await checkAdmin(req.userId))) {
      return res.status(403).json({ error: 'Admin permission required.' });
    }

    const { id } = req.params;
    const userToToggle = await prisma.user.findUnique({ where: { id } });

    if (!userToToggle) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (userToToggle.role === 'admin') {
      return res.status(400).json({ error: 'Admin accounts cannot be suspended.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isSuspended: !userToToggle.isSuspended }
    });

    // If suspended, delete all sessions to log them out instantly
    if (updatedUser.isSuspended) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    res.json({ 
      message: `User ${updatedUser.email} has been successfully ${updatedUser.isSuspended ? 'suspended' : 'unsuspended'}.`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isSuspended: updatedUser.isSuspended
      }
    });
  } catch (err) {
    console.error('Admin toggle suspend error:', err);
    res.status(500).json({ error: 'Failed to toggle account suspension.' });
  }
}

/**
 * Gets email logs audit history.
 */
export async function getEmailLogs(req, res) {
  try {
    if (!(await checkAdmin(req.userId))) {
      return res.status(403).json({ error: 'Admin permission required.' });
    }

    const logs = await prisma.emailLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 100
    });

    res.json(logs);
  } catch (err) {
    console.error('Admin get email logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve email logs.' });
  }
}

/**
 * Reads security and authentication audit logs file.
 */
export async function getAuditLogs(req, res) {
  try {
    if (!(await checkAdmin(req.userId))) {
      return res.status(403).json({ error: 'Admin permission required.' });
    }

    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      return res.json([]);
    }

    const logContent = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8');
    const logs = logContent
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line };
        }
      })
      .reverse() // Newest first
      .slice(0, 100); // limit to 100

    res.json(logs);
  } catch (err) {
    console.error('Admin get audit logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
}
