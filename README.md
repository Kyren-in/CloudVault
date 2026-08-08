# ☁️ CloudVault – Secure Multi-Cloud Storage Platform

CloudVault is a modern, premium, and futuristic multi-cloud distributed file storage solution. Built with an Apple-inspired glassmorphism design system, it splits, compresses, encrypts, and distributes files across **Backblaze B2** and **Cloudflare R2** in parallel, eliminating single points of failure.

---

## ✨ Core Features

### 🛡️ Next-Gen Security & Hardening
- **Zero-Trust Input Validation**: End-to-end parameters checked server-side using **Zod** schema validations. 
- **HTML/Script Tag Blocking**: Any input containing HTML/script elements is instantly rejected to prevent XSS and SQL injection.
- **Brute-Force Protection**: 
  - **Per-IP Rate Limiting**: Limit of 30 attempts per minute to block scripting tools.
  - **Account Lockouts**: Accounts locked for 15 minutes after 6 consecutive failed attempts (with progressive lock duration penalties).
  - **Adaptive Delay Penalty**: Enforces progressive delays (1s to 10s) starting on the 3rd failed attempt to throttle dictionary attacks.
  - **Constant-Time Verification**: Uses cryptographically secure constant-time password comparisons.
- **Generic Error Responses**: Replaces descriptive authentication failures with generic messages to prevent account enumeration.
- **Outbound Redacted Logging**: All failures write to [auth_audit.log](backend/auth_audit.log) with passwords, tokens, and secrets fully redacted.
- **Token Expiration Auto-Logout**: Global fetch interceptor automatically captures `401 Unauthorized` responses (expired/invalid sessions) to clear local credentials and auto-logout users immediately.

### 📁 Advanced File Upload & Decrypted Previews
- **Multi-Threaded Chunk Uploads**: Client-side slicing of files into 10MB blocks, uploaded in parallel using concurrent streams with support for dynamic resume.
- **Adaptive Compression Optimizer**: Smart compression logic dynamically bypasses CPU-heavy Brotli compression for pre-compressed media formats (like `.mp4`, `.mp3`, `.zip`, `.png`) or files > 25MB, resolving server request timeouts (`Failed to fetch`).
- **Magic Byte Content Verification**: Inspects file buffers to validate actual contents (blocking PE Executables, ELF Binaries, Java Classes, and scripting headers) instead of trusting file extensions.
- **Isolated Storage**: Uploaded chunks are encrypted with **AES-256** and stored outside the web root (or in separate S3 cloud buckets).
- **Secure Decrypted Previews**:
  - Temporary client-side decrypted inline previews of files without saving to disk.
  - **Images**: Responsive image renderer.
  - **PDFs**: Interactive inline embedding using `<embed>` with a high-compatibility "Open in New Tab" fallback action.
  - **Videos & Audio**: Interactive HTML5 players.
  - **Text & Code**: Scrollable monospaced code viewer with a quick "Copy to Clipboard" utility.
  - **MIME-Type Casting**: Automatic reconstruction of generic octet-streams to extension-specific MIME types (e.g. `image/png`, `application/pdf`) to enable native browser rendering.

### 📈 Premium UI/UX Console
- **Adaptive Dark/Light Themes**: Automatically tracks and matches the user's system theme preferences (`prefers-color-scheme`) on load, with custom settings to toggle manual overrides.
- **Refined Light Mode**: CSS variables and root overrides style layout cards into clean light-gray shades, text into high-contrast black typography, and lines into soft gray dividers.
- **Latency Monitoring**: Real-time custom SVG line chart measuring network responses from active cloud providers.
- **Storage Allocation**: Gauge tracking storage limits and compression efficiency savings.
- **Timeline Workflow**: Interactive step-by-step graphic outlining encryption, compression, and distribution pipelines.

---

## 🛠️ Technology Stack

- **Frontend**: React, Vite, CSS (custom variables, glassmorphism, prefers-theme detection), Lucide React
- **Backend**: Node.js, Express, Multer (100MB file limit)
- **Database**: PostgreSQL (Supabase) connected via **Prisma ORM**
- **Cloud Adapters**: `@aws-sdk/client-s3` (S3 integration for Backblaze B2 & Cloudflare R2)

---

## ⚙️ Environment Configuration

Create a `.env` file inside the `backend` folder:

```ini
# Database (PostgreSQL / Supabase)
DATABASE_URL="postgresql://postgres.[USER]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Server Port
PORT=5000
JWT_SECRET="your-super-secret-key"

# Cloud storage mode (set to false for live production storage)
USE_MOCK_STORAGE=false

# Backblaze B2
BACKBLAZE_ACCESS_KEY_ID="your-b2-access-key-id"
BACKBLAZE_SECRET_ACCESS_KEY="your-b2-secret-access-key"
BACKBLAZE_ENDPOINT="https://s3.[region].backblazeb2.com"
BACKBLAZE_REGION="us-east-005"
BACKBLAZE_BUCKET_NAME="your-b2-bucket-name"

# Cloudflare R2
CLOUDFLARE_ACCESS_KEY_ID="your-r2-access-key-id"
CLOUDFLARE_SECRET_ACCESS_KEY="your-r2-secret-access-key"
CLOUDFLARE_ENDPOINT="https://[account-id].r2.cloudflarestorage.com"
CLOUDFLARE_BUCKET_NAME="your-r2-bucket-name"
```

---

## 🚀 Getting Started

### 1. Database Setup
Ensure Prisma is initialized:
```bash
cd backend
npx prisma generate
npx prisma db push
```

### 2. Launch Backend Server
```bash
cd backend
npm install
npm start
```

### 3. Launch Frontend Development Server
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔄 Third-Party Auth Integration (Checklist)
If you wish to migrate from homegrown auth to **Supabase Auth** or **Clerk**, reference our comprehensive migration roadmap: [supabase_auth_migration.md](backend/supabase_auth_migration.md) (contains triggers, middleware routing, and OAuth browser setups).

---

## 📄 License
This project is licensed under the MIT License.
