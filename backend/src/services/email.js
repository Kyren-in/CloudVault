import nodemailer from 'nodemailer';
import { prisma } from '../config/db.js';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@cloudvault.io';

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
  console.log(`[EMAIL SERVICE] Configured SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
} else {
  console.log('[EMAIL SERVICE] Credentials not set. Running in simulation mode.');
}

async function logAndSendEmail(options) {
  const { to, subject, html, text, type } = options;
  let status = 'SENT';
  let details = null;

  try {
    if (transporter) {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text,
        html
      });
      console.log(`📧 [EMAIL SENT] To: ${to} | Subject: ${subject}`);
    } else {
      // Mock logger fallback
      console.log(`\n==================================================`);
      console.log(`📧 [EMAIL SIMULATION] OUTBOUND EMAIL NOTIFICATION`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body (Plain):`);
      console.log(text);
      console.log(`==================================================\n`);
      details = 'Simulated email output printed to console logs.';
    }
  } catch (error) {
    console.error(`❌ [EMAIL FAILURE] To: ${to} | Error:`, error.message);
    status = 'FAILED';
    details = error.message;
  }

  // Record log in Postgres DB
  try {
    await prisma.emailLog.create({
      data: {
        email: to,
        type,
        status,
        details
      }
    });
  } catch (dbErr) {
    console.error('Failed to save EmailLog in DB:', dbErr.message);
  }

  if (status === 'FAILED') {
    throw new Error(details || 'Failed to deliver email.');
  }
  return true;
}

export async function sendOtpEmail(email, otp) {
  const subject = `${otp} is your CloudVault verification code`;
  const text = `Hi,

Please use the following 6-digit One-Time Password (OTP) to complete your CloudVault account creation:

${otp}

This code will expire in 10 minutes. If you did not initiate this request, you can safely ignore this email.

Thanks,
The CloudVault Security Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0284c7; font-size: 20px; margin-bottom: 10px;">CloudVault Verification Code</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Please use the following One-Time Password (OTP) to complete your signup process:</p>
      <div style="font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 4px; padding: 15px; background-color: #f8fafc; border-radius: 6px; text-align: center; margin: 20px 0;">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">This code expires in 10 minutes. For security, do not share this code with anyone.</p>
    </div>
  `;

  return logAndSendEmail({ to: email, subject, text, html, type: 'OTP' });
}

export async function sendWelcomeEmail(email, name) {
  const subject = `Welcome to CloudVault, ${name}!`;
  const text = `Hi ${name},

Welcome to CloudVault v2!

Your account has been successfully created. You can now log in to the dashboard to compress, encrypt, and distribute your assets securely across multiple clouds.

Features active on your account:
- AES-256 client-side encryption keys
- Brotli lossless compression
- Decentralized multi-cloud redundancy (Backblaze B2 + Cloudflare R2)

If you have any questions, feel free to reach out to our help center.

Best,
The CloudVault Security Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0284c7; font-size: 20px; margin-bottom: 10px;">Welcome to CloudVault!</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Hi ${name},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your account is ready. You are now equipped with enterprise-grade decentralized multi-cloud asset protection.</p>
      <ul style="font-size: 13px; color: #475569; padding-left: 20px; line-height: 1.6;">
        <li>AES-256 client-side encryption keys</li>
        <li>Brotli lossless compression</li>
        <li>Dynamic multi-cloud failover routing</li>
      </ul>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">The CloudVault Security Team</p>
    </div>
  `;

  return logAndSendEmail({ to: email, subject, text, html, type: 'WELCOME' });
}

export async function sendResetPasswordEmail(email, name, resetUrl) {
  const subject = `Reset your CloudVault Password`;
  const text = `Hi ${name},

You requested a password reset for your CloudVault account. Please click the link below to set a new password:

${resetUrl}

This link is single-use and will expire in 15 minutes. If you did not request this, you can ignore this email.

Best,
The CloudVault Security Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0284c7; font-size: 20px; margin-bottom: 10px;">Reset Password Request</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Hi ${name},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Please click the button below to reset your CloudVault password:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 6px; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">This link will expire in 15 minutes. If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="font-size: 11px; word-break: break-all; color: #0284c7;">${resetUrl}</p>
    </div>
  `;

  return logAndSendEmail({ to: email, subject, text, html, type: 'RESET' });
}

export async function sendLockoutEmail(email) {
  const subject = `Security Alert: Your CloudVault account has been temporarily locked`;
  const text = `Security alert: Your CloudVault account has been temporarily locked

due to 6 consecutive failed login attempts.

The lock will automatically expire in 15 minutes. If you did not cause this lock, please contact our administrator immediately.

Thanks,
The CloudVault Security Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f87171; border-radius: 8px; border-top: 4px solid #ef4444;">
      <h2 style="color: #ef4444; font-size: 20px; margin-bottom: 10px;">Security Lockout Alert</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your account has been temporarily locked due to 6 failed login attempts.</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">The lock is active for <strong>15 minutes</strong>. It will clear automatically once the duration lapses.</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">If this wasn't you, please change your credentials immediately.</p>
    </div>
  `;

  return logAndSendEmail({ to: email, subject, text, html, type: 'LOCKOUT' });
}
