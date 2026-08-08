import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, Lock, Shield, HardDrive, RefreshCw, FileText, Trash2, 
  Download, UploadCloud, LogOut, CheckCircle2, AlertTriangle, 
  Activity, Terminal, User, Server, Database, Key, Check, Info,
  Eye, EyeOff, Menu, X, ArrowRight, ChevronDown, Award, Sparkles,
  TrendingUp, Cpu, PieChart, BarChart2, Bell, Settings,
  HelpCircle, Star, ShieldCheck, ChevronRight, Laptop, Smartphone,
  Globe, AlertCircle, Play, Pause, Trash, ShieldAlert, Users,
  Mail, History, CheckSquare, Sun, Moon, Search
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://cloudvault-backend-bmpf.onrender.com/api';
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunk size for client-to-server uploads
const uploadPreferences = {
  concurrency: 3
};



export default function App() {
  // Session & Authentication
  const [token, setToken] = useState(localStorage.getItem('cv_token') || '');
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('cv_refresh_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('cv_user')) || null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authState, setAuthState] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset'
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // App views: 'landing' | 'dashboard'
  const [viewMode, setViewMode] = useState(token ? 'dashboard' : 'landing');
  const [activeSidebarTab, setActiveSidebarTab] = useState('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Custom Glassmorphic Toast Notifications State
  const [toasts, setToasts] = useState([]);

  // Auth Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  
  // OTP Registration Flow State
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [authLoading, setAuthLoading] = useState(false);

  // Real-time Password Strength Meter State
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordSuggestions, setPasswordSuggestions] = useState([]);
  const [passwordRoast, setPasswordRoast] = useState('');

  // Files & Dashboard State
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({
    storageUsed: { originalBytes: 0, cloudBytes: 0, savingsBytes: 0 },
    distribution: { backblaze: 0, cloudflare: 0 },
    providers: {
      backblaze: { name: 'Backblaze B2', type: 'backblaze', online: true, latency: 95, isMock: true },
      cloudflare: { name: 'Cloudflare R2', type: 'cloudflare', online: true, latency: 60, isMock: true }
    }
  });
  
  const [filesLoading, setFilesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Failover route healthy: B2 & R2 sync successful.', time: '10m ago', unread: true },
    { id: 2, text: 'Brotli compression applied: saved 68% space on document.txt.', time: '1h ago', unread: false }
  ]);
  
  // Profile settings state
  const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem('cv_profile_photo') || '');
  const [activeSessions, setActiveSessions] = useState([]);
  const [changePasswordOld, setChangePasswordOld] = useState('');
  const [changePasswordNew, setChangePasswordNew] = useState('');

  // Settings configurations
  const [theme, setTheme] = useState(localStorage.getItem('cv_theme') || 'dark');
  const [language, setLanguage] = useState('en');
  const [uploadThreshold, setUploadThreshold] = useState(10); // MB

  // Admin Panel State
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminEmailLogs, setAdminEmailLogs] = useState([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState([]);
  const [adminActiveSubTab, setAdminActiveSubTab] = useState('users'); // 'users' | 'email' | 'audit'
  const [adminSearch, setAdminSearch] = useState('');

  // --- HIGH SPEED CHUNK UPLOAD STATE ---
  const [uploadState, setUploadState] = useState({
    file: null,
    uploadId: '',
    filename: '',
    size: 0,
    progress: 0,
    speed: 0, // bytes/sec
    eta: 0, // seconds
    status: 'idle', // 'idle' | 'hashing' | 'uploading' | 'paused' | 'done' | 'failed'
    error: '',
    chunks: [] // { chunkNumber, start, end, progress, status }
  });
  const uploadXHRsRef = useRef([]); // holds active XHR controllers for pause/abort
  const uploadStartTimeRef = useRef(null);
  const uploadBytesUploadedRef = useRef(0);

  const [downloadingFile, setDownloadingFile] = useState(null); // { id, name, step, log: [] }
  const [actionError, setActionError] = useState('');

  // Interactive Landing States
  const [timelineStep, setTimelineStep] = useState(1);
  const [faqOpen, setFaqOpen] = useState(null);
  const [splitSimulationStep, setSplitSimulationStep] = useState('idle'); // 'idle' | 'splitting' | 'distributed'

  // Cursor & Spotlight State
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isCursorHovered, setIsCursorHovered] = useState(false);
  
  const fileInputRef = useRef(null);
  const profilePhotoInputRef = useRef(null);
  const logsEndRef = useRef(null);

  // Auto-scroll logs in operations feed
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load reset token from URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let tokenFromUrl = searchParams.get('resetToken') || searchParams.get('token');

    if (!tokenFromUrl && window.location.hash) {
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        tokenFromUrl = hashParams.get('resetToken') || hashParams.get('token');
      }
    }

    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setAuthState('reset');
      setShowAuthModal(true);
      addToast('Password reset link detected. Please choose a new password.', 'info');
      addLog('Password reset link detected. Opening reset password panel.');
    }
  }, []);

  // Track global mouse coordinates for premium spotlight glow
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.tagName === 'INPUT' ||
        target.closest('.cursor-pointer') ||
        target.classList.contains('cursor-pointer')
      ) {
        setIsCursorHovered(true);
      } else {
        setIsCursorHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  // Theme application
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#0B1020';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#F8FAFC';
    }
    localStorage.setItem('cv_theme', theme);
  }, [theme]);

  // Fetch dashboard metadata when token is active
  useEffect(() => {
    if (token && viewMode === 'dashboard') {
      if (isGuestMode) {
        loadGuestMockData();
      } else {
        fetchDashboardData();
        fetchActiveSessions();
        if (user?.role === 'admin') {
          fetchAdminData();
        }
      }
      addLog('Secure CloudVault session initialized.');
    }
  }, [token, viewMode]);

  // Timer for OTP code resending
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Automatic JWT Access Token silent refresh every 14 minutes
  useEffect(() => {
    if (!token || isGuestMode) return;
    
    const refreshInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          setToken(data.token);
          localStorage.setItem('cv_token', data.token);
          addLog('Authentication token silently refreshed.');
        } else {
          addLog('Silent session refresh failed. Please log in again.', 'warn');
          addToast('Session expired. Please log in again.', 'warning');
          handleLogout();
        }
      } catch (err) {
        console.error('Silent refresh network error:', err);
      }
    }, 14 * 60 * 1000); // 14 mins

    return () => clearInterval(refreshInterval);
  }, [token, refreshToken]);

  // Password strength meter validator
  useEffect(() => {
    const val = authState === 'reset' ? newPassword : password;
    if (!val) {
      setPasswordStrength(0);
      setPasswordSuggestions([]);
      setPasswordRoast('');
      return;
    }

    let score = 0;
    const feedback = [];

    if (val.length >= 8) {
      score += 1;
    } else {
      feedback.push('Use at least 8 characters');
    }

    if (/[A-Z]/.test(val)) {
      score += 1;
    } else {
      feedback.push('Add an uppercase letter');
    }

    if (/[a-z]/.test(val)) {
      score += 1;
    } else {
      feedback.push('Add a lowercase letter');
    }

    if (/[0-9]/.test(val)) {
      score += 1;
    } else {
      feedback.push('Add a number');
    }

    if (/[^A-Za-z0-9]/.test(val)) {
      score += 1;
    } else {
      feedback.push('Add a special character symbol');
    }

    setPasswordStrength(score);
    setPasswordSuggestions(feedback);

    // GenZ funny reactions & dark roasts
    if (score <= 1) {
      setPasswordRoast('💀 Really? A toddler typing on a play-piano could guess this. Roast: Is your brain running on Internet Explorer?');
    } else if (score === 2) {
      setPasswordRoast('🤡 Better, but a script kiddie could crack this while eating chicken nuggets. Add some spice (numbers, symbols).');
    } else if (score === 3) {
      setPasswordRoast('🤔 Mid. Still hackable before GTA 6 launches. Add uppercase or punctuation to prevent tears.');
    } else if (score === 4) {
      setPasswordRoast('🧐 Good, but don\'t get cocky. A supercomputer might take 2 minutes instead of 2 seconds. Add symbols.');
    } else {
      setPasswordRoast('🔥 Wow, okay, calm down Mr. NSA Agent. Even the quantum computers are sweating. You must be fun at parties.');
    }
  }, [password, newPassword, authState]);

  // --- CUSTOM TOAST NOTIFICATIONS ---
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // Populate interactive mock data for instant "Live Demo" experience
  const loadGuestMockData = () => {
    setFiles([
      {
        id: 'mock-1',
        filename: 'quarterly_financials.xlsx',
        size: 14500000,
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        compression: 'brotli',
        encrypted: true,
        chunks: [
          { chunkNumber: 1, provider: 'backblaze', size: 5000000 },
          { chunkNumber: 2, provider: 'cloudflare', size: 5000000 },
          { chunkNumber: 3, provider: 'backblaze', size: 4500000 }
        ]
      },
      {
        id: 'mock-2',
        filename: 'identity_verification.pdf',
        size: 2400000,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        compression: 'brotli',
        encrypted: true,
        chunks: [
          { chunkNumber: 1, provider: 'backblaze', size: 2400000 },
          { chunkNumber: 1, provider: 'cloudflare', size: 2400000 }
        ]
      }
    ]);
    setStats({
      storageUsed: { originalBytes: 16900000, cloudBytes: 9800000, savingsBytes: 7100000 },
      distribution: { backblaze: 3, cloudflare: 2 },
      providers: {
        backblaze: { name: 'Backblaze B2', type: 'backblaze', online: true, latency: 85, isMock: true },
        cloudflare: { name: 'Cloudflare R2', type: 'cloudflare', online: true, latency: 55, isMock: true }
      }
    });
    addLog('Running in LIVE DEMO guest mode. Storage is simulated.', 'warn');
  };

  const fetchDashboardData = async () => {
    setFilesLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const filesRes = await fetch(`${API_BASE}/files`, { headers });
      const filesData = await filesRes.json();
      if (filesRes.ok) {
        setFiles(filesData);
      }

      const statsRes = await fetch(`${API_BASE}/storage`, { headers });
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setStats(statsData);
      }
    } catch (err) {
      console.error(err);
      addLog('Failed to synchronize dashboard statistics.', 'error');
    } finally {
      setFilesLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSessions(data);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const usersRes = await fetch(`${API_BASE}/admin/users`, { headers });
      if (usersRes.ok) {
        setAdminUsers(await usersRes.json());
      }
      
      const emailsRes = await fetch(`${API_BASE}/admin/email-logs`, { headers });
      if (emailsRes.ok) {
        setAdminEmailLogs(await emailsRes.json());
      }
      
      const auditRes = await fetch(`${API_BASE}/admin/audit-logs`, { headers });
      if (auditRes.ok) {
        setAdminAuditLogs(await auditRes.json());
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cv_token');
    localStorage.removeItem('cv_refresh_token');
    localStorage.removeItem('cv_user');
    setToken('');
    setRefreshToken('');
    setUser(null);
    setIsGuestMode(false);
    setFiles([]);
    setLogs([]);
    setViewMode('landing');
    addToast('Logged out successfully.', 'info');
    addLog('Session terminated.');
  };

  const enterLiveDemo = () => {
    setIsGuestMode(true);
    const mockUser = { name: 'Demo Guest', email: 'guest@cloudvault.io', role: 'user' };
    setToken('mock-guest-token');
    setUser(mockUser);
    setViewMode('dashboard');
    addToast('Welcome to Live Guest Demo!', 'success');
    addLog('Logged in as guest.', 'success');
  };

  // --- REGISTRATION & OTP SEND FLOW ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (passwordStrength < 4) {
      addToast('Please enter a strong password before verifying email.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setOtpSent(true);
      setOtpTimer(60);
      addToast('Verification code sent to your email.', 'success');
      addLog(`Verification OTP code sent to: ${email}`);

      // Bypass for local testing if provided
      if (data.otp) {
        setOtpCode(data.otp);
        addLog(`[DEVELOPMENT BYPASS] Auto-filled OTP code: ${data.otp}`, 'warn');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);

    let endpoint = authState;
    let payload = {};

    if (authState === 'login') {
      payload = { email, password };
    } else if (authState === 'signup') {
      payload = { name, email, password, code: otpCode };
    } else if (authState === 'forgot') {
      endpoint = 'forgot-password';
      payload = { email };
    } else if (authState === 'reset') {
      endpoint = 'reset-password';
      payload = { token: resetToken, newPassword };
    }

    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication action failed.');
      }

      if (authState === 'forgot') {
        addToast(data.message, 'success');
        if (data.resetToken) {
          setResetToken(data.resetToken);
          setAuthState('reset');
          addToast('Password reset code generated.', 'success');
          addLog(`Dev mode reset token generated: ${data.resetToken.substring(0, 15)}...`, 'success');
        }
      } else if (authState === 'reset') {
        addToast('Password reset successful. Please sign in.', 'success');
        setTimeout(() => {
          setAuthState('login');
          setNewPassword('');
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 2000);
      } else {
        // Sign In / Sign Up Success
        localStorage.setItem('cv_token', data.token);
        localStorage.setItem('cv_refresh_token', data.refreshToken);
        localStorage.setItem('cv_user', JSON.stringify(data.user));
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        setUser(data.user);
        setIsGuestMode(false);
        setViewMode('dashboard');
        setShowAuthModal(false);
        addToast(`Login successful. Welcome ${data.user.name}!`, 'success');
        
        // Clear forms
        setName('');
        setEmail('');
        setPassword('');
        setOtpCode('');
        setOtpSent(false);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleToggleProvider = async (providerKey) => {
    if (isGuestMode) {
      setStats(prev => {
        const nextProviders = { ...prev.providers };
        nextProviders[providerKey].online = !nextProviders[providerKey].online;
        nextProviders[providerKey].latency = nextProviders[providerKey].online ? (providerKey === 'cloudflare' ? 60 : 95) : 0;
        
        addToast(`${nextProviders[providerKey].name} is now ${nextProviders[providerKey].online ? 'ONLINE' : 'OFFLINE'}`, nextProviders[providerKey].online ? 'success' : 'warning');
        addLog(`Simulated status for ${nextProviders[providerKey].name} set to ${nextProviders[providerKey].online ? 'ONLINE' : 'OFFLINE'}`, nextProviders[providerKey].online ? 'success' : 'warn');
        return { ...prev, providers: nextProviders };
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/storage/health/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ provider: providerKey })
      });
      const data = await res.json();
      
      if (res.ok) {
        setStats(prev => ({ ...prev, providers: data.providers }));
        const current = data.providers[providerKey];
        addToast(`${current.name} is now ${current.online ? 'ONLINE' : 'OFFLINE'}`, current.online ? 'success' : 'warning');
        addLog(`Simulated status for ${current.name} changed to ${current.online ? 'ONLINE' : 'OFFLINE'}`, current.online ? 'success' : 'warn');
        fetchDashboardData();
      }
    } catch (err) {
      addToast('Failed to toggle provider status.', 'error');
    }
  };

  // --- INTERACTIVE DEVICE SESSIONS MANAGEMENT ---
  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Device session revoked.', 'success');
        addLog('Device session revoked successfully.');
        fetchActiveSessions();
      }
    } catch (err) {
      addToast('Failed to revoke session.', 'error');
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('Are you sure you want to log out from ALL other devices? This will invalidate all refresh tokens.')) return;
    try {
      const res = await fetch(`${API_BASE}/auth/sessions`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Successfully logged out from all other devices.', 'success');
        addLog('Revoked all other active user sessions.');
        fetchActiveSessions();
      }
    } catch (err) {
      addToast('Failed to revoke all sessions.', 'error');
    }
  };

  // --- PASSWORD PROFILE CHANGES ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!changePasswordNew || changePasswordNew.length < 8) {
      addToast('New password must be at least 8 characters.', 'error');
      return;
    }
    try {
      // Simulate/Trigger reset link or call direct password change if endpoint exists
      // For MVP, we can simulate or trigger reset endpoint. Let's send reset password link:
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        addToast('A password reset verification email has been sent to your inbox.', 'success');
        setChangePasswordOld('');
        setChangePasswordNew('');
      } else {
        addToast('Failed to update password.', 'error');
      }
    } catch (err) {
      addToast('Network error while resetting password.', 'error');
    }
  };

  // --- PROFILE IMAGE SIMULATOR ---
  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Image = uploadEvent.target.result;
      setProfilePhoto(base64Image);
      localStorage.setItem('cv_profile_photo', base64Image);
      addToast('Profile picture updated successfully.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // --- ADMIN ACTIONS ---
  const handleToggleSuspendUser = async (uId, currentSuspendState, uEmail) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${uId}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`User ${uEmail} has been ${!currentSuspendState ? 'suspended' : 'unsuspended'}.`, 'success');
        addLog(`Admin toggled suspension for user: ${uEmail}`);
        fetchAdminData();
      } else {
        addToast(data.error || 'Failed to toggle suspension.', 'error');
      }
    } catch (err) {
      addToast('Admin suspension action failed.', 'error');
    }
  };

  // --- PARALLEL MULTIPART CHUNKED UPLOAD PIPELINE ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setActionError('');
    addLog(`Preparing parallel multipart upload for: ${file.name} (${formatBytes(file.size)})`);

    // Guest Mode Simulation
    if (isGuestMode) {
      setUploadState({
        file,
        filename: file.name,
        size: file.size,
        progress: 10,
        speed: 1.2 * 1024 * 1024,
        eta: 5,
        status: 'uploading',
        error: '',
        chunks: []
      });
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      await sleep(600);
      setUploadState(p => ({ ...p, status: 'hashing', progress: 30 }));
      await sleep(600);
      setUploadState(p => ({ ...p, status: 'uploading', progress: 60 }));
      await sleep(1000);
      setUploadState(p => ({ ...p, progress: 100, status: 'done' }));
      
      const newFileObj = {
        id: `mock-${Date.now()}`,
        filename: file.name,
        size: file.size,
        createdAt: new Date().toISOString(),
        compression: 'brotli',
        encrypted: true,
        chunks: file.size >= (10 * 1024 * 1024) ? [
          { chunkNumber: 1, provider: 'backblaze', size: 5000000 },
          { chunkNumber: 2, provider: 'cloudflare', size: file.size - 5000000 }
        ] : [
          { chunkNumber: 1, provider: 'backblaze', size: file.size },
          { chunkNumber: 1, provider: 'cloudflare', size: file.size }
        ]
      };
      setFiles(prev => [newFileObj, ...prev]);
      
      const compressedSize = Math.floor(file.size * 0.45);
      setStats(prev => {
        const nextUsed = {
          originalBytes: prev.storageUsed.originalBytes + file.size,
          cloudBytes: prev.storageUsed.cloudBytes + (file.size >= (10 * 1024 * 1024) ? compressedSize : (compressedSize * 2)),
          savingsBytes: prev.storageUsed.savingsBytes + (file.size - compressedSize)
        };
        return { ...prev, storageUsed: nextUsed };
      });

      addToast('Upload Completed successfully!', 'success');
      addLog(`[GUEST MODE] File "${file.name}" uploaded successfully!`, 'success');
      await sleep(800);
      setUploadState(p => ({ ...p, status: 'idle' }));
      return;
    }

    // Actual Multi-Threaded Chunk Upload Flow
    setUploadState({
      file,
      uploadId: '',
      filename: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'hashing',
      error: '',
      chunks: []
    });

    try {
      // 1. Calculate SHA-256 Hash client-side using Web Crypto API
      const arrayBuffer = await file.arrayBuffer();
      addLog('Calculating file integrity hash...');
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      addLog(`SHA-256 generated: ${fileHash.substring(0, 16)}...`);

      // 2. Initiate Upload session
      const initRes = await fetch(`${API_BASE}/upload/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filename: file.name, size: file.size, hash: fileHash })
      });
      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to initiate upload.');
      }

      // 2.1 Deduplication instant completion check
      if (initData.exists) {
        setUploadState(p => ({ ...p, progress: 100, status: 'done' }));
        addToast('Instant Upload complete (matched via hash)!', 'success');
        addLog('File matched database ledger. Deduplicated instantly.', 'success');
        fetchDashboardData();
        setTimeout(() => setUploadState(p => ({ ...p, status: 'idle' })), 1000);
        return;
      }

      const uploadId = initData.uploadId;
      const uploadedChunks = initData.uploadedChunks || []; // e.g. [1, 2] for resumed uploads
      
      if (uploadedChunks.length > 0) {
        addLog(`Resuming upload. Detected ${uploadedChunks.length} chunks already on server.`);
        addToast(`Resuming file upload...`, 'info');
      }

      // 3. Slice file into 10MB chunks
      const chunkSize = CHUNK_SIZE;
      const numChunks = Math.ceil(file.size / chunkSize);
      const chunkList = [];

      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunkNumber = i + 1;
        const isUploaded = uploadedChunks.includes(chunkNumber);
        
        chunkList.push({
          chunkNumber,
          start,
          end,
          progress: isUploaded ? 100 : 0,
          status: isUploaded ? 'completed' : 'pending',
          chunkFileSlice: file.slice(start, end)
        });
      }

      setUploadState(p => ({
        ...p,
        uploadId,
        status: 'uploading',
        progress: Math.floor((uploadedChunks.length / numChunks) * 100),
        chunks: chunkList
      }));

      // Initialize trackers
      uploadStartTimeRef.current = Date.now();
      uploadBytesUploadedRef.current = uploadedChunks.length * chunkSize;
      uploadXHRsRef.current = [];

      // Start queue processing
      processUploadQueue(uploadId, fileHash, file.name, file.size, chunkList);

    } catch (err) {
      setUploadState(p => ({ ...p, status: 'failed', error: err.message }));
      addToast(err.message, 'error');
      addLog(`Upload aborted: ${err.message}`, 'error');
    }
  };

  // Processes chunks concurrently using XMLHttpRequests
  const processUploadQueue = (uploadId, fileHash, filename, totalSize, currentChunks) => {
    const CONCURRENCY = uploadPreferences.concurrency || 3;
    let activeUploads = uploadXHRsRef.current.length;

    const runNext = async () => {
      // If upload is paused, cancelled, or failed, stop queue
      if (uploadState.status === 'paused' || uploadState.status === 'failed') return;

      const nextPending = currentChunks.find(c => c.status === 'pending');
      if (!nextPending) {
        // If all chunks are finished, finalize
        if (currentChunks.every(c => c.status === 'completed') && activeUploads === 0) {
          finalizeUploadSession(uploadId, fileHash, filename, totalSize);
        }
        return;
      }

      // Mark chunk as uploading
      nextPending.status = 'uploading';
      activeUploads++;

      // Read slice arrayBuffer to calculate chunk hash
      const chunkBuffer = await nextPending.chunkFileSlice.arrayBuffer();
      const chunkHashBuffer = await crypto.subtle.digest('SHA-256', chunkBuffer);
      const chunkHashArray = Array.from(new Uint8Array(chunkHashBuffer));
      const chunkHash = chunkHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Create XHR request for upload speed & progress tracking
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkNumber', nextPending.chunkNumber);
      formData.append('chunkHash', chunkHash);
      formData.append('file', nextPending.chunkFileSlice);

      xhr.open('POST', `${API_BASE}/upload/chunk`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Track chunk uploading progress
      let lastUploadedBytes = 0;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const loadedThisInterval = e.loaded - lastUploadedBytes;
          lastUploadedBytes = e.loaded;
          uploadBytesUploadedRef.current += loadedThisInterval;

          nextPending.progress = Math.floor((e.loaded / e.total) * 100);
          updateGlobalProgress(currentChunks, totalSize);
        }
      };

      xhr.onload = () => {
        activeUploads--;
        uploadXHRsRef.current = uploadXHRsRef.current.filter(x => x !== xhr);

        if (xhr.status >= 200 && xhr.status < 300) {
          nextPending.status = 'completed';
          nextPending.progress = 100;
          runNext();
        } else {
          // Retry logic (up to 3 attempts)
          nextPending.retries = (nextPending.retries || 0) + 1;
          if (nextPending.retries <= 3) {
            nextPending.status = 'pending';
            addLog(`Retrying chunk #${nextPending.chunkNumber} (Attempt ${nextPending.retries}/3)...`, 'warn');
          } else {
            nextPending.status = 'failed';
            setUploadState(p => ({ ...p, status: 'failed', error: 'Chunk upload failed after 3 attempts.' }));
            addToast(`Chunk #${nextPending.chunkNumber} failed. Upload paused.`, 'error');
            abortAllUploadXHRs();
          }
        }
      };

      xhr.onerror = () => {
        activeUploads--;
        uploadXHRsRef.current = uploadXHRsRef.current.filter(x => x !== xhr);
        nextPending.retries = (nextPending.retries || 0) + 1;
        if (nextPending.retries <= 3) {
          nextPending.status = 'pending';
        } else {
          nextPending.status = 'failed';
          setUploadState(p => ({ ...p, status: 'failed', error: 'Network upload stream connection failed.' }));
          addToast('Network connection failed. Upload paused.', 'error');
          abortAllUploadXHRs();
        }
      };

      uploadXHRsRef.current.push(xhr);
      xhr.send(formData);

      // Launch more parallel streams up to capacity
      if (activeUploads < CONCURRENCY) {
        runNext();
      }
    };

    // Bootstrap concurrency pool
    for (let j = 0; j < CONCURRENCY; j++) {
      runNext();
    }
  };

  const updateGlobalProgress = (chunks, totalSize) => {
    const totalProgressBytes = chunks.reduce((sum, c) => {
      const size = c.end - c.start;
      return sum + (size * (c.progress / 100));
    }, 0);

    const elapsedSeconds = (Date.now() - uploadStartTimeRef.current) / 1000;
    const speed = elapsedSeconds > 0 ? (totalProgressBytes / elapsedSeconds) : 0;
    const remainingBytes = Math.max(0, totalSize - totalProgressBytes);
    const eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 999;

    setUploadState(p => ({
      ...p,
      progress: Math.min(99, Math.floor((totalProgressBytes / totalSize) * 100)),
      speed,
      eta,
      chunks: [...chunks]
    }));
  };

  const abortAllUploadXHRs = () => {
    uploadXHRsRef.current.forEach(xhr => xhr.abort());
    uploadXHRsRef.current = [];
  };

  const handlePauseUpload = () => {
    abortAllUploadXHRs();
    setUploadState(p => {
      const resetChunks = p.chunks.map(c => c.status === 'uploading' ? { ...c, status: 'pending', progress: 0 } : c);
      return {
        ...p,
        status: 'paused',
        chunks: resetChunks
      };
    });
    addToast('Upload paused.', 'info');
    addLog('Parallel chunk upload paused by user.');
  };

  const handleResumeUpload = async () => {
    if (!uploadState.file) return;

    setUploadState(p => ({ ...p, status: 'uploading' }));
    addToast('Resuming upload...', 'info');
    addLog('Resuming file upload session.');

    try {
      // Re-fetch initiation to get server state
      const res = await fetch(`${API_BASE}/upload/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filename: uploadState.filename, size: uploadState.size, hash: uploadState.uploadId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const uploadedChunks = data.uploadedChunks || [];
      const updatedChunks = uploadState.chunks.map(c => {
        const isUploaded = uploadedChunks.includes(c.chunkNumber);
        return {
          ...c,
          status: isUploaded ? 'completed' : 'pending',
          progress: isUploaded ? 100 : 0
        };
      });

      uploadStartTimeRef.current = Date.now();
      uploadBytesUploadedRef.current = uploadedChunks.length * CHUNK_SIZE;

      setUploadState(p => ({
        ...p,
        chunks: updatedChunks,
        progress: Math.floor((uploadedChunks.length / updatedChunks.length) * 100)
      }));

      processUploadQueue(uploadState.uploadId, uploadState.uploadId, uploadState.filename, uploadState.size, updatedChunks);
    } catch (err) {
      setUploadState(p => ({ ...p, status: 'failed', error: err.message }));
      addToast(err.message, 'error');
    }
  };

  const handleCancelUpload = async () => {
    abortAllUploadXHRs();
    const uploadId = uploadState.uploadId;
    setUploadState(p => ({ ...p, status: 'idle', file: null }));
    addToast('Upload cancelled.', 'info');
    addLog('File upload cancelled and cache cleared.');

    try {
      await fetch(`${API_BASE}/upload/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uploadId })
      });
    } catch (err) {
      console.error('Cancel upload server error:', err);
    }
  };

  const finalizeUploadSession = async (uploadId, fileHash, filename, totalSize) => {
    setUploadState(p => ({ ...p, progress: 99, status: 'uploading' }));
    addLog('All chunks uploaded. Requesting multi-cloud decryption re-assembly...');

    try {
      const res = await fetch(`${API_BASE}/upload/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uploadId, filename, size: totalSize, hash: fileHash })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Finalize request failed.');
      }

      setUploadState(p => ({ ...p, progress: 100, status: 'done' }));
      addToast('Upload completed successfully!', 'success');
      addLog(`File "${filename}" successfully encrypted and replicated across cloud outposts!`, 'success');
      
      fetchDashboardData();
      if (user?.role === 'admin') fetchAdminData();
      
      setTimeout(() => {
        setUploadState(p => ({ ...p, status: 'idle', file: null }));
      }, 1000);

    } catch (err) {
      setUploadState(p => ({ ...p, status: 'failed', error: err.message }));
      addToast(err.message, 'error');
      addLog(`Upload finalize failed: ${err.message}`, 'error');
    }
  };

  // --- DOWNLOAD FLOW ---
  const handleDownload = async (fileObj) => {
    setActionError('');
    setDownloadingFile({
      id: fileObj.id,
      name: fileObj.filename,
      step: 'metadata',
      log: ['Fetching file distribution map...']
    });

    const addDlLog = (msg) => {
      setDownloadingFile(prev => prev ? { ...prev, log: [...prev.log, msg] } : null);
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    addLog(`Requesting download payload for: ${fileObj.filename}`);
    await sleep(400);

    addDlLog(`Reading chunk records (Total chunks: ${fileObj.chunks.length})...`);
    
    const providersState = stats.providers;
    await sleep(500);
    setDownloadingFile(prev => ({ ...prev, step: 'pulling' }));
    
    // Simulate chunk download logs
    for (const chunk of fileObj.chunks) {
      const providerInfo = providersState[chunk.provider] || { name: chunk.provider.toUpperCase(), online: true, latency: 80 };
      addDlLog(`Downloading chunk #${chunk.chunkNumber} from ${providerInfo.name}...`);
      
      if (!providerInfo.online) {
        addDlLog(`[FAILOVER] ${providerInfo.name} is OFFLINE! Checking alternative replica node...`);
        const backup = fileObj.chunks.find(c => c.chunkNumber === chunk.chunkNumber && c.provider !== chunk.provider);
        if (backup) {
          const backupInfo = providersState[backup.provider] || { name: backup.provider.toUpperCase(), online: true };
          if (backupInfo.online) {
            addDlLog(`[FAILOVER] Backup replica found on ${backupInfo.name}. Pulling chunk #${chunk.chunkNumber}...`);
            await sleep(600);
            addDlLog(`Chunk #${chunk.chunkNumber} successfully retrieved from backup node.`);
          } else {
            addDlLog(`[CRITICAL] Backup replica on ${backupInfo.name} is also OFFLINE!`);
          }
        } else {
          addDlLog(`[CRITICAL] No backup replica exists for chunk #${chunk.chunkNumber}!`);
        }
      } else {
        await sleep(400);
        addDlLog(`Chunk #${chunk.chunkNumber} retrieved (Latency: ${providerInfo.online ? providerInfo.latency + 'ms' : '∞'})`);
      }
    }

    setDownloadingFile(prev => ({ ...prev, step: 'decrypting' }));
    addDlLog(`Merging payload streams...`);
    await sleep(350);
    addDlLog(`Initializing AES-256-GCM decipher. Verifying cryptographic GCM tag...`);
    await sleep(350);
    addDlLog(`Decompressing file using Brotli decompress stream...`);
    await sleep(350);

    if (isGuestMode) {
      const blob = new Blob(['Mock file content for: ' + fileObj.filename], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileObj.filename;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setDownloadingFile(prev => ({ ...prev, step: 'done' }));
      addToast('Download completed successfully!', 'success');
      addLog(`[GUEST MODE] Download completed: ${fileObj.filename}`, 'success');
      await sleep(800);
      setDownloadingFile(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/download/${fileObj.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Server rejected retrieval.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileObj.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setDownloadingFile(prev => ({ ...prev, step: 'done' }));
      addToast('Download completed successfully!', 'success');
      addLog(`File downloaded & decrypted: ${fileObj.filename}`, 'success');
      
      await sleep(800);
      setDownloadingFile(null);
    } catch (err) {
      setActionError(err.message);
      addToast(err.message, 'error');
      addLog(`Download failed: ${err.message}`, 'error');
      addDlLog(`[ERROR] Download terminated: ${err.message}`);
      await sleep(3000);
      setDownloadingFile(null);
    }
  };

  // --- DELETE ASSET FLOW ---
  const handleDelete = async (fileId, filename) => {
    if (!confirm(`Are you sure you want to permanently delete "${filename}" across all cloud nodes?`)) return;
    
    setActionError('');
    addLog(`Initiating purge sequence for: ${filename}`);

    if (isGuestMode) {
      const deletedFile = files.find(f => f.id === fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (deletedFile) {
        setStats(prev => {
          const comp = Math.floor(deletedFile.size * 0.45);
          return {
            ...prev,
            storageUsed: {
              originalBytes: Math.max(0, prev.storageUsed.originalBytes - deletedFile.size),
              cloudBytes: Math.max(0, prev.storageUsed.cloudBytes - comp),
              savingsBytes: Math.max(0, prev.storageUsed.savingsBytes - (deletedFile.size - comp))
            }
          };
        });
      }
      addToast('File purged successfully.', 'success');
      addLog(`[GUEST MODE] File "${filename}" purged successfully.`, 'success');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deletion failed.');
      }

      addToast('File purged successfully across all clouds.', 'success');
      addLog(`File "${filename}" successfully purged from cloud nodes.`, 'success');
      fetchDashboardData();
      if (user?.role === 'admin') fetchAdminData();
    } catch (err) {
      setActionError(err.message);
      addToast(err.message, 'error');
      addLog(`Deletion failed: ${err.message}`, 'error');
    }
  };

  // Utility formatters
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getCompressionRatio = (original, compressed) => {
    if (!original || !compressed) return '0%';
    const ratio = ((original - compressed) / original) * 100;
    return ratio > 0 ? `${ratio.toFixed(1)}%` : '0%';
  };

  const triggerSplitSimulation = async () => {
    if (splitSimulationStep !== 'idle') return;
    setSplitSimulationStep('splitting');
    await new Promise(r => setTimeout(r, 1200));
    setSplitSimulationStep('distributed');
    await new Promise(r => setTimeout(r, 3000));
    setSplitSimulationStep('idle');
  };

  // Filter files by search query
  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProviderQuota = (key) => {
    if (key === 'backblaze') return 10 * 1024 * 1024 * 1024;
    if (key === 'cloudflare') return 10 * 1024 * 1024 * 1024;
    return 5 * 1024 * 1024 * 1024;
  };
  
  const cloudUsed = stats.storageUsed.cloudBytes;
  const totalFreeTier = Object.keys(stats.providers).reduce((sum, key) => sum + getProviderQuota(key), 0) || (20 * 1024 * 1024 * 1024);
  const usedPercent = totalFreeTier > 0 ? Math.min(100, (cloudUsed / totalFreeTier) * 100) : 0;

  // Custom Chart Rendering inside Dashboard
  const PerformanceChart = () => {
    return (
      <div className="w-full bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Network Latency Flow</div>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-400 rounded-full"></span>Cloudflare R2</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-violet-500 rounded-full"></span>Backblaze B2</span>
          </div>
        </div>
        <svg className="w-full h-32" viewBox="0 0 500 120">
          <defs>
            <linearGradient id="r2-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="b2-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
          <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
          <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
          
          <path d="M0,90 C50,85 100,50 150,55 C200,60 250,45 300,48 C350,52 400,35 450,40 L500,45 L500,120 L0,120 Z" fill="url(#r2-grad)" />
          <path d="M0,90 C50,85 100,50 150,55 C200,60 250,45 300,48 C350,52 400,35 450,40 L500,45" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          
          <path d="M0,110 C50,90 100,85 150,88 C200,90 250,75 300,78 C350,65 400,60 450,62 L500,65 L500,120 L0,120 Z" fill="url(#b2-grad)" />
          <path d="M0,110 C50,90 100,85 150,88 C200,90 250,75 300,78 C350,65 400,60 450,62 L500,65" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="2,1" />

          <circle cx="150" cy="55" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" className="cursor-pointer" />
          <circle cx="350" cy="65" r="3.5" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="1.5" className="cursor-pointer" />
        </svg>
      </div>
    );
  };

  // Helper: return OS device icons
  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <Laptop className="w-4 h-4" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return <Laptop className="w-4 h-4 text-sky-400" />;
    if (ua.includes('mac') || ua.includes('iphone') || ua.includes('ipad')) return <Laptop className="w-4 h-4 text-slate-350" />;
    if (ua.includes('android')) return <Smartphone className="w-4 h-4 text-emerald-450" />;
    if (ua.includes('linux')) return <Cpu className="w-4 h-4 text-amber-500" />;
    return <Smartphone className="w-4 h-4 text-slate-500" />;
  };

  // --- RENDERING VIEWS ---
  
  return (
    <div className={`min-h-screen text-slate-100 flex flex-col font-sans relative select-none bg-[#0B1020] transition-colors duration-300 dark:bg-[#0B1020] ${theme === 'light' ? 'bg-slate-50 text-slate-900' : ''}`}>
      
      {/* Dynamic Stackable Toast Container */}
      <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className="glass-toast p-4 rounded-xl flex items-start gap-3 justify-between shadow-2xl relative overflow-hidden animate-fade-in"
          >
            <div className="flex gap-2.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-455 shrink-0" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
              <span className={`text-xs font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>{t.message}</span>
            </div>
            <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${t.type === 'success' ? 'from-emerald-400 to-teal-500' : t.type === 'error' ? 'from-rose-500 to-red-650' : 'from-sky-400 to-indigo-500'} animate-[shimmer_4s_linear_forwards] w-full`} />
          </div>
        ))}
      </div>

      {/* Mouse follow background spotlight */}
      <div 
        className="pointer-events-none fixed z-0 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(79,140,255,0.04)_0,rgba(123,97,255,0.02)_50%,transparent_100%)] -translate-x-1/2 -translate-y-1/2 blur-2xl hidden md:block"
        style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
      />

      {/* Custom cursor followers */}
      <div 
        className={`pointer-events-none fixed z-50 rounded-full border border-sky-400/40 -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ease-out hidden md:block ${isCursorHovered ? 'w-12 h-12 bg-sky-400/10 border-sky-400/80' : 'w-6 h-6'}`}
        style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
      />
      <div 
        className="pointer-events-none fixed z-50 w-1.5 h-1.5 rounded-full bg-sky-400 -translate-x-1/2 -translate-y-1/2 hidden md:block"
        style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
      />

      {viewMode === 'landing' ? (
        // ================== LANDING PAGE VIEW ==================
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="glow-spot-blue -top-20 -left-20"></div>
          <div className="glow-spot-purple top-1/3 -right-20"></div>

          {/* Glass Navbar */}
          <header className="glass-panel border-b border-white/5 sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-650 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Cloud className="w-5 h-5 text-slate-100" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  CloudVault
                </h1>
                <p className="text-[10px] text-slate-400 tracking-wider">SECURE MULTI-CLOUD</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
              <a href="#features" className="hover:text-sky-400 transition-colors">Features</a>
              <a href="#workflow" className="hover:text-sky-400 transition-colors">Workflow</a>
              <a href="#faq" className="hover:text-sky-400 transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center gap-4">
              <button 
                onClick={enterLiveDemo}
                className="text-xs text-slate-350 hover:text-white px-4 py-2 border border-white/10 hover:border-white/30 rounded-lg font-bold transition-all cursor-pointer"
              >
                Try Guest Demo
              </button>
              <button 
                onClick={() => {
                  setAuthState('login');
                  setShowAuthModal(true);
                }}
                className="text-xs text-slate-905 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-650 px-4 py-2 rounded-lg font-bold shadow-lg shadow-sky-500/10 transition-all hover:scale-105 cursor-pointer text-slate-950"
              >
                Sign In
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-5xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" /> Premium Glassmorphism UI Active
            </div>

            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Decentralized Cloud.<br/>
              <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-indigo-650 bg-clip-text text-transparent">
                Bulletproof Encryption.
              </span>
            </h2>

            <p className="text-slate-300 text-base md:text-lg max-w-2xl mb-10 leading-relaxed font-normal">
              CloudVault v2 compresses, encrypts, and splits your files into separate secure chunks, uploading them parallelly to Backblaze B2 & Cloudflare R2 automatically. Uptime and privacy guaranteed.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-16 justify-center">
              <button 
                onClick={() => {
                  setAuthState('signup');
                  setShowAuthModal(true);
                }}
                className="px-8 py-4 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-slate-950 font-bold rounded-xl text-sm transition-all hover:scale-105 shadow-xl shadow-sky-500/15 flex items-center gap-2 cursor-pointer"
              >
                Get Started Free <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Network Simulator Graphic */}
            <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 border border-white/5 shadow-2xl relative overflow-hidden mb-12">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multi-Cloud Distribution Simulator</span>
                <button 
                  onClick={triggerSplitSimulation}
                  className="px-3 py-1.5 text-[10px] font-bold text-sky-400 border border-sky-400/20 rounded hover:bg-sky-400/10 transition-all cursor-pointer"
                >
                  {splitSimulationStep === 'idle' ? 'Run Simulation' : splitSimulationStep === 'splitting' ? 'Encrypting...' : 'Distributed!'}
                </button>
              </div>

              <div className="h-44 flex items-center justify-between relative px-8">
                {/* File Node */}
                <div className="z-10 flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-all duration-500 ${splitSimulationStep === 'splitting' ? 'border-sky-400 bg-sky-500/10 scale-105' : 'border-slate-800 bg-slate-900'}`}>
                    <FileText className="w-7 h-7 text-sky-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-350">Document.pdf</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg className="w-full h-full stroke-slate-800" viewBox="0 0 500 150">
                    <path d="M 80 75 L 250 75" strokeWidth="2" strokeDasharray="5,5" />
                    <path d="M 250 75 L 420 35" strokeWidth="2" strokeDasharray="5,5" />
                    <path d="M 250 75 L 420 115" strokeWidth="2" strokeDasharray="5,5" />
                    {splitSimulationStep === 'splitting' && (
                      <circle cx="80" cy="75" r="5" fill="#38bdf8">
                        <animate attributeName="cx" from="80" to="250" dur="1s" repeatCount="1" />
                      </circle>
                    )}
                    {splitSimulationStep === 'distributed' && (
                      <>
                        <circle cx="250" cy="75" r="4" fill="#38bdf8">
                          <animate attributeName="cx" from="250" to="420" dur="1.2s" repeatCount="1" />
                          <animate attributeName="cy" from="75" to="35" dur="1.2s" repeatCount="1" />
                        </circle>
                        <circle cx="250" cy="75" r="4" fill="#8b5cf6">
                          <animate attributeName="cx" from="250" to="420" dur="1.2s" repeatCount="1" />
                          <animate attributeName="cy" from="75" to="115" dur="1.2s" repeatCount="1" />
                        </circle>
                      </>
                    )}
                  </svg>
                </div>

                {/* Router */}
                <div className={`z-10 w-12 h-12 rounded-full border flex items-center justify-center transition-all ${splitSimulationStep === 'splitting' ? 'border-sky-400 bg-sky-500/10 rotate-180 duration-1000' : 'border-slate-800 bg-slate-900'}`}>
                  <Shield className="w-5 h-5 text-sky-400" />
                </div>

                {/* Cloud Outposts */}
                <div className="z-10 flex flex-col gap-8">
                  <div className={`flex items-center gap-3 p-2 px-3 rounded-lg border transition-all ${splitSimulationStep === 'distributed' ? 'border-sky-400 bg-sky-500/10' : 'border-slate-800 bg-slate-900'}`}>
                    <Cloud className="w-5 h-5 text-sky-400" />
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-white uppercase">Cloudflare R2</div>
                      <div className="text-[8px] text-slate-500 font-mono">Chunk 1 (Encrypted)</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-2 px-3 rounded-lg border transition-all ${splitSimulationStep === 'distributed' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-800 bg-slate-900'}`}>
                    <Cloud className="w-5 h-5 text-violet-400" />
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-white uppercase">Backblaze B2</div>
                      <div className="text-[8px] text-slate-500 font-mono">Chunk 2 (Encrypted)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Comparison table, FAQ and other sections are accessible on page */}
          <footer className="w-full border-t border-white/5 bg-slate-950/20 py-8 relative z-10 text-center text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} CloudVault Inc. Premium Glassmorphic Storage Panel.</span>
          </footer>
        </div>
      ) : (
        // ================== DASHBOARD CONSOLE VIEW ==================
        <div className="flex-1 flex h-screen overflow-hidden relative">
          
          {/* Mobile menu sidebar overlay */}
          <div 
            className={`fixed inset-0 bg-slate-950/80 z-40 transition-opacity md:hidden ${showMobileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
            onClick={() => setShowMobileMenu(false)} 
          />

          {/* Left Sidebar Navigation */}
          <aside className={`fixed md:relative top-0 bottom-0 left-0 w-64 glass-panel border-r border-white/5 p-6 flex flex-col justify-between z-40 transition-transform duration-300 md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="space-y-8">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-tr from-sky-450 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-white tracking-tight">CloudVault</h1>
                  <p className="text-[9px] text-slate-550 tracking-wider">CONSOLE v2.0</p>
                </div>
              </div>

              {/* Sidebar Tabs */}
              <nav className="space-y-1.5">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: HardDrive },
                  { id: 'files', label: 'Vault Files', icon: FileText },
                  { id: 'storage', label: 'Storage Allocation', icon: PieChart },
                  { id: 'analytics', label: 'Health Analytics', icon: BarChart2 },
                  { id: 'profile', label: 'Profile Settings', icon: User },
                  { id: 'settings', label: 'Console Settings', icon: Settings }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveSidebarTab(t.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full p-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeSidebarTab === t.id ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <t.icon className={`w-4 h-4 ${activeSidebarTab === t.id ? 'text-sky-400' : 'text-slate-500'}`} />
                    <span>{t.label}</span>
                  </button>
                ))}

                {/* Admin Tab (Only visible to admin accounts) */}
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setActiveSidebarTab('admin');
                      setShowMobileMenu(false);
                      fetchAdminData();
                    }}
                    className={`w-full p-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeSidebarTab === 'admin' ? 'bg-red-500/10 text-rose-400 border-l-2 border-rose-500' : 'text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/5'}`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Profile Avatar / Terminate Session */}
            <div className="space-y-4">
              {isGuestMode && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-2.5 text-[10px] leading-normal">
                  <strong>Guest Mode Active.</strong> Log in to save files persistently.
                </div>
              )}
              
              <div 
                className="flex items-center justify-between border-t border-white/5 pt-4 cursor-pointer"
                onClick={() => setActiveSidebarTab('profile')}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400 shrink-0 border border-sky-400/25">
                      {user?.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate max-w-[110px]">{user?.name}</div>
                    <div className="text-[9px] text-slate-500 truncate max-w-[110px]">{user?.email}</div>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  className="p-1.5 text-slate-450 hover:text-rose-455 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
            {/* Header navbar */}
            <header className="w-full glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-4">
                <button className="md:hidden p-1 text-slate-350 hover:text-white rounded-lg" onClick={() => setShowMobileMenu(true)}>
                  <Menu className="w-5 h-5" />
                </button>
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search encrypted vault assets..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 w-64 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-450/40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Theme Toggler */}
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 text-slate-450 hover:text-white bg-slate-900/60 border border-white/5 rounded-lg cursor-pointer"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-1.5 text-slate-450 hover:text-white bg-slate-900/60 border border-white/5 rounded-lg relative cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.some(n => n.unread) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-sky-400 rounded-full animate-ping"></span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-72 glass-panel rounded-xl border border-white/10 shadow-2xl p-4 z-50 text-xs space-y-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="font-bold text-white">Notifications</span>
                        <button 
                          onClick={() => {
                            setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                            addLog('Notifications cleared.');
                          }}
                          className="text-[9px] text-sky-400 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-2">
                        {notifications.map(n => (
                          <div key={n.id} className="p-2 rounded-lg border bg-slate-900/40 border-white/5 flex flex-col gap-0.5">
                            <div className="text-slate-200 leading-normal">{n.text}</div>
                            <div className="text-[9px] text-slate-500 font-medium self-end">{n.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-5 w-px bg-white/10"></div>
                <div className="text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-400/20 px-2 py-0.5 rounded uppercase">
                  {isGuestMode ? 'GUEST DEMO' : 'SECURE SESSION'}
                </div>
              </div>
            </header>

            <main className="p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
              
              {/* TAB 1: MAIN DASHBOARD */}
              {activeSidebarTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Stats & Health Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quota Ring */}
                    <div className="lg:col-span-1 glass-panel rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center glow-card">
                      <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4 self-start flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-sky-400" /> Storage Capacity Usage
                      </h3>
                      
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="transparent" 
                            stroke="url(#radial-progress)" 
                            strokeWidth="8" 
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * usedPercent) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                          <defs>
                            <linearGradient id="radial-progress" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute flex flex-col items-center text-center">
                          <span className="text-2xl font-extrabold text-white">{usedPercent.toFixed(1)}%</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">USED</span>
                        </div>
                      </div>

                      <div className="mt-5 w-full space-y-2 text-xs text-slate-350 border-t border-white/5 pt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Uncompressed size:</span>
                          <span className="font-semibold text-white">{formatBytes(stats.storageUsed.originalBytes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Encrypted cloud footprint:</span>
                          <span className="font-semibold text-sky-400">{formatBytes(stats.storageUsed.cloudBytes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Brotli Deflate Compression:</span>
                          <span className="font-semibold text-emerald-450">
                            {getCompressionRatio(stats.storageUsed.originalBytes, stats.storageUsed.cloudBytes)} ({formatBytes(stats.storageUsed.savingsBytes)} Saved)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Failover Outpost Control */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 p-6 flex flex-col justify-between glow-card">
                      <div>
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-2">
                            <Server className="w-4 h-4 text-violet-400" /> Multi-Cloud Provider Failover Control
                          </h3>
                          <div className="flex items-center gap-1 text-[9px] text-emerald-450 uppercase font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                            <Activity className="w-3.5 h-3.5" /> Failover Active
                          </div>
                        </div>
                        <p className="text-slate-450 text-xs mb-4">
                          Simulate cloud outages. If a node goes offline, the download pipeline automatically re-routes traffic to the backup provider.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {Object.entries(stats.providers).map(([key, provider]) => (
                            <div key={key} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-3.5 h-3.5 rounded-full ${provider.online ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20 animate-pulse' : 'bg-rose-500 shadow-lg shadow-rose-500/20'}`} />
                                  <div>
                                    <div className="text-xs font-bold text-white">{provider.name}</div>
                                    <div className="text-[9px] text-slate-550 uppercase tracking-wider">
                                      {isGuestMode ? 'Simulated Outpost' : 'Production Bucket'}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleToggleProvider(key)}
                                  className={`px-3 py-1 text-[9px] font-bold rounded uppercase tracking-wider border transition-all cursor-pointer ${
                                    provider.online 
                                      ? 'bg-rose-950/20 text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
                                      : 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                                  }`}
                                >
                                  {provider.online ? 'Kill Node' : 'Revive'}
                                </button>
                              </div>
                              <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-2 text-slate-400">
                                <span>Outpost Latency:</span>
                                <span className="font-mono text-slate-200">
                                  {provider.online ? `${provider.latency} ms` : '∞ (Offline)'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <PerformanceChart />
                    </div>
                  </div>

                  {/* Upload & Ledger */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Drag-Drop Zone */}
                    <div className="lg:col-span-1 flex flex-col">
                      <div className="glass-panel rounded-2xl border border-white/5 p-6 flex-1 flex flex-col justify-between glow-card">
                        <div>
                          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <UploadCloud className="w-4 h-4 text-sky-400" /> Vault File Injection
                          </h3>
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border border-dashed border-white/10 hover:border-sky-500/50 bg-slate-900/30 hover:bg-sky-500/5 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group"
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                              <UploadCloud className="w-6 h-6 text-sky-400" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-200">Inject raw asset</h4>
                            <p className="text-[10px] text-slate-500 mt-1">Select any file from your device</p>
                            <p className="text-[9px] text-slate-500 mt-4 leading-normal font-mono max-w-[180px] mx-auto">
                              Files &ge; 10MB chunk split. Under 10MB replicate sync.
                            </p>
                          </div>
                        </div>

                        {/* Console Logs */}
                        <div className="space-y-2 mt-6">
                          <div className="text-[10px] font-bold text-slate-450 uppercase flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-sky-450" /> Operational Console Log
                          </div>
                          <div className="bg-slate-950/80 border border-white/5 rounded-lg p-3 font-mono text-[9px] h-28 overflow-y-auto custom-scrollbar space-y-1.5">
                            {logs.map((log, idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                <span className={
                                  log.type === 'error' ? 'text-rose-455' :
                                  log.type === 'warn' ? 'text-amber-400' :
                                  log.type === 'success' ? 'text-emerald-450' :
                                  'text-slate-400'
                                }>
                                  {log.message}
                                </span>
                              </div>
                            ))}
                            {logs.length === 0 && (
                              <div className="text-slate-600 italic">No operational logs generated yet.</div>
                            )}
                            <div ref={logsEndRef} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Decentralized Ledger */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 p-6 glow-card flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Database className="w-4 h-4 text-sky-450" /> Decentralized File Ledger
                        </h3>

                        <div className="overflow-x-auto min-h-[250px]">
                          {filesLoading ? (
                            <div className="space-y-3 py-6">
                              <div className="h-10 w-full shimmer-bg rounded-lg"></div>
                              <div className="h-10 w-full shimmer-bg rounded-lg"></div>
                              <div className="h-10 w-full shimmer-bg rounded-lg"></div>
                            </div>
                          ) : filteredFiles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs">
                              <Database className="w-8 h-8 text-slate-700 mb-2" />
                              <span>No encrypted cloud assets matched.</span>
                            </div>
                          ) : (
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-white/5 text-slate-500 uppercase font-semibold">
                                  <th className="pb-3 pl-2">Asset Details</th>
                                  <th className="pb-3">Layout Map</th>
                                  <th className="pb-3 text-right">Raw Size</th>
                                  <th className="pb-3 pr-2 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {filteredFiles.map(file => {
                                  const isLarge = file.size >= (10 * 1024 * 1024);
                                  const fileProviders = [...new Set(file.chunks.map(c => c.provider))];
                                  const friendlyNames = {
                                    backblaze: 'B2',
                                    cloudflare: 'R2'
                                  };

                                  return (
                                    <tr key={file.id} className="hover:bg-white/3 transition-colors">
                                      <td className="py-3.5 pl-2 max-w-[200px] truncate font-medium text-slate-200">
                                        <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                                          <div className="truncate">
                                            <div className="truncate text-slate-200 font-bold" title={file.filename}>
                                              {file.filename}
                                            </div>
                                            <div className="text-[9px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                              <span className="flex items-center text-emerald-450 gap-0.5">
                                                <Shield className="w-3 h-3" /> Encrypted GCM
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3.5">
                                        {!isLarge ? (
                                          <div className="flex flex-col gap-1">
                                            <span className="font-bold text-emerald-400 text-[9px] bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded w-max">
                                              REPLICATED SYNC
                                            </span>
                                            <div className="flex gap-1.5 items-center mt-1 flex-wrap">
                                              {fileProviders.map(p => (
                                                <span key={p} className="text-[8px] text-sky-400 border border-sky-450/20 px-1 rounded uppercase font-mono">
                                                  {friendlyNames[p] || p.toUpperCase()}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col gap-1">
                                            <span className="font-bold text-violet-400 text-[9px] bg-violet-500/5 border border-violet-500/10 px-2 py-0.5 rounded w-max">
                                              DISTRIBUTED CHUNKS
                                            </span>
                                            <div className="flex gap-1.5 items-center mt-1 text-[8px] text-slate-500 flex-wrap">
                                              <span>
                                                {file.chunks.length} blocks ({
                                                  fileProviders.map(p => {
                                                    const count = file.chunks.filter(c => c.provider === p).length;
                                                    return `${count}x ${friendlyNames[p] || p.toUpperCase()}`;
                                                  }).join(', ')
                                                })
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3.5 text-right font-mono text-slate-350">
                                        {formatBytes(file.size)}
                                      </td>
                                      <td className="py-3.5 pr-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            onClick={() => handleDownload(file)}
                                            className="p-1.5 text-slate-450 hover:text-sky-400 bg-slate-900 border border-white/5 rounded-lg hover:scale-105 transition-all cursor-pointer"
                                            title="Download and Decrypt"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(file.id, file.filename)}
                                            className="p-1.5 text-slate-450 hover:text-rose-455 bg-slate-900 border border-white/5 rounded-lg hover:scale-105 transition-all cursor-pointer"
                                            title="Purge Asset"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: FILES LISTING */}
              {activeSidebarTab === 'files' && (
                <div className="glass-panel rounded-2xl border border-white/5 p-6 glow-card animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400" /> Vault Document Ledger
                    </h3>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 px-4 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-650 text-slate-950 rounded-lg text-xs font-bold shadow-lg shadow-sky-500/10 cursor-pointer"
                    >
                      Upload New File
                    </button>
                  </div>
                  
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter files by filename..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full rounded-lg bg-slate-900/60 border border-white/5 text-xs text-white focus:outline-none focus:border-sky-400/40"
                    />
                  </div>

                  <div className="overflow-x-auto min-h-[350px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 uppercase font-semibold">
                          <th className="pb-3 pl-2">Asset Details</th>
                          <th className="pb-3">Layout Map</th>
                          <th className="pb-3 text-right">Raw Size</th>
                          <th className="pb-3 pr-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredFiles.map(file => {
                          const isLarge = file.size >= (10 * 1024 * 1024);
                          const fileProviders = [...new Set(file.chunks.map(c => c.provider))];
                          return (
                            <tr key={file.id} className="hover:bg-white/3 transition-colors">
                              <td className="py-3.5 pl-2 max-w-[200px] truncate font-medium text-slate-200">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                                  <div className="truncate">
                                    <div className="truncate text-slate-200 font-bold">{file.filename}</div>
                                    <div className="text-[9px] text-slate-500 mt-0.5">
                                      {new Date(file.createdAt).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5">
                                {!isLarge ? (
                                  <span className="font-bold text-emerald-450 text-[9px] bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded uppercase">
                                    REPLICATED ({fileProviders.length}x)
                                  </span>
                                ) : (
                                  <span className="font-bold text-violet-400 text-[9px] bg-violet-500/5 border border-violet-500/10 px-2 py-0.5 rounded uppercase">
                                    CHUNKED ({file.chunks.length} blocks)
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-right font-mono text-slate-350">
                                {formatBytes(file.size)}
                              </td>
                              <td className="py-3.5 pr-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleDownload(file)} className="p-1.5 text-slate-450 hover:text-sky-400 bg-slate-900 border border-white/5 rounded-lg cursor-pointer">
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(file.id, file.filename)} className="p-1.5 text-slate-450 hover:text-rose-455 bg-slate-900 border border-white/5 rounded-lg cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredFiles.length === 0 && (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-slate-500">No assets found matching filter query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: STORAGE ALLOCATION */}
              {activeSidebarTab === 'storage' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div className="glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-sky-400" /> B2 & R2 Allocations
                    </h3>
                    <div className="space-y-5 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Backblaze B2 (Quota: 10GB)</span>
                          <span className="font-bold text-white">
                            {formatBytes(files.reduce((acc, f) => acc + f.chunks.filter(c => c.provider === 'backblaze').reduce((s, c) => s + c.size, 0), 0))}
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-sky-400 h-1.5 rounded-full" style={{ width: '4%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Cloudflare R2 (Quota: 10GB)</span>
                          <span className="font-bold text-white">
                            {formatBytes(files.reduce((acc, f) => acc + f.chunks.filter(c => c.provider === 'cloudflare').reduce((s, c) => s + c.size, 0), 0))}
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: '2.5%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-4 text-xs">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Multi-Cloud Policy Summary</h3>
                    <p className="text-slate-450 leading-relaxed">
                      By default, files under 10MB are fully replicated to both Cloudflare R2 and Backblaze B2. 
                      Files 10MB or larger are segmented into chunks and distributed in a round-robin format.
                    </p>
                    <p className="text-slate-450 leading-relaxed">
                      This double-tier storage structure guarantees data integrity even if one of the providers is offline.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: HEALTH ANALYTICS */}
              {activeSidebarTab === 'analytics' && (
                <div className="glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-6 animate-fade-in">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-400" /> Outpost Performance Analytics
                  </h3>
                  <PerformanceChart />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Average Response Delay</div>
                      <div className="text-lg font-bold text-white">77 ms</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Packet Deflate savings</div>
                      <div className="text-lg font-bold text-emerald-450">42.8% Saved</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Total Active outposts</div>
                      <div className="text-lg font-bold text-sky-400">2 / 2 Online</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PROFILE SETTINGS */}
              {activeSidebarTab === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                  {/* Photo & Password */}
                  <div className="lg:col-span-1 glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="relative group cursor-pointer" onClick={() => profilePhotoInputRef.current?.click()}>
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-sky-455" />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-sky-400 border border-sky-400/20">
                            {user?.name ? user.name[0].toUpperCase() : 'U'}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white uppercase">
                          Upload
                        </div>
                        <input
                          type="file"
                          ref={profilePhotoInputRef}
                          onChange={handleProfilePhotoChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{user?.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user?.email}</p>
                      </div>
                    </div>

                    {/* Change Password Form */}
                    <form onSubmit={handleChangePassword} className="space-y-4 border-t border-white/5 pt-4 text-xs">
                      <h4 className="font-bold text-slate-350 uppercase tracking-wider text-[10px]">Change password</h4>
                      
                      <div>
                        <label className="block text-slate-500 mb-1.5 font-semibold">New Password</label>
                        <input
                          type="password"
                          required
                          value={changePasswordNew}
                          onChange={e => setChangePasswordNew(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/5 text-xs text-white focus:outline-none focus:border-sky-400"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Request Password Reset
                      </button>
                    </form>
                  </div>

                  {/* Device Sessions */}
                  <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                          <History className="w-4 h-4 text-violet-400" /> Active Device Sessions
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1">Logged in devices utilizing security refresh tokens</p>
                      </div>
                      <button 
                        onClick={handleLogoutAllDevices}
                        className="px-3 py-1.5 bg-rose-950/20 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 text-[10px] font-bold rounded uppercase cursor-pointer"
                      >
                        Revoke All
                      </button>
                    </div>

                    <div className="divide-y divide-white/5 text-xs max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                      {activeSessions.map(session => (
                        <div key={session.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                              {getDeviceIcon(session.deviceInfo)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-200 max-w-sm truncate" title={session.deviceInfo}>
                                {session.deviceInfo}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {session.ipAddress || 'Unknown IP'}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span>Active: {new Date(session.lastUsedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-455 hover:bg-rose-550/10 rounded-lg cursor-pointer"
                            title="Revoke session"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {activeSessions.length === 0 && (
                        <div className="py-6 text-center text-slate-500 italic">Failed to synchronize active sessions list.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: SETTINGS */}
              {activeSidebarTab === 'settings' && (
                <div className="glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-6 max-w-2xl animate-fade-in">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-400" /> Console Settings
                  </h3>
                  
                  <div className="space-y-4 text-xs">
                    {/* Appearance theme selection */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">Theme Selection</div>
                        <div className="text-[10px] text-slate-500 mt-1">Configure dashboard color profile</div>
                      </div>
                      <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 gap-1">
                        {['dark', 'light'].map(tOpt => (
                          <button
                            key={tOpt}
                            onClick={() => setTheme(tOpt)}
                            className={`px-3 py-1 text-[10px] font-bold rounded uppercase cursor-pointer ${theme === tOpt ? 'bg-sky-500/10 text-sky-400 border border-sky-400/20' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            {tOpt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language selector */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">Language Preference</div>
                        <div className="text-[10px] text-slate-500 mt-1">Select application dashboard locale</div>
                      </div>
                      <select 
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="bg-slate-950 border border-white/5 text-[11px] text-slate-350 p-1 px-3 rounded-lg focus:outline-none focus:border-sky-400"
                      >
                        <option value="en">English (US)</option>
                        <option value="es">Español (ES)</option>
                        <option value="fr">Français (FR)</option>
                      </select>
                    </div>

                    {/* Security standards */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">Encryption Standard</div>
                        <div className="text-[10px] text-slate-500 mt-1">Client-side cryptographic encryption cipher</div>
                      </div>
                      <div className="text-xs font-bold text-emerald-450 uppercase flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> AES-256-GCM
                      </div>
                    </div>

                    {/* Brotli Deflate */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">Brotli Deflate compression</div>
                        <div className="text-[10px] text-slate-500 mt-1">Pre-encryption lossless compression quality</div>
                      </div>
                      <div className="text-xs font-bold text-sky-450">Quality: 9 (Optimal)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: ADMIN CONTROL PANEL */}
              {activeSidebarTab === 'admin' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Admin sub header buttons */}
                  <div className="flex border-b border-white/5 pb-2 gap-4">
                    {[
                      { id: 'users', label: 'User Accounts', icon: Users },
                      { id: 'email', label: 'Email Log Audit', icon: Mail },
                      { id: 'audit', label: 'Auth History Audit', icon: History }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setAdminActiveSubTab(sub.id)}
                        className={`pb-2 px-1 text-xs font-bold flex items-center gap-2 border-b-2 cursor-pointer ${adminActiveSubTab === sub.id ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-405 hover:text-slate-200'}`}
                      >
                        <sub.icon className="w-4 h-4" />
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {/* Sub tab content: Users Management */}
                  {adminActiveSubTab === 'users' && (
                    <div className="glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Users Dashboard</h4>
                        <input
                          type="text"
                          placeholder="Search users by name/email..."
                          value={adminSearch}
                          onChange={e => setAdminSearch(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-xs text-white focus:outline-none focus:border-sky-400 w-64"
                        />
                      </div>

                      <div className="overflow-x-auto text-xs min-h-[300px]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-slate-500 uppercase font-semibold">
                              <th className="pb-3 pl-2">User Details</th>
                              <th className="pb-3">Registration</th>
                              <th className="pb-3 text-right">File Count</th>
                              <th className="pb-3 text-right">Storage Footprint</th>
                              <th className="pb-3 text-right pr-2">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {adminUsers
                              .filter(u => u.name.toLowerCase().includes(adminSearch.toLowerCase()) || u.email.toLowerCase().includes(adminSearch.toLowerCase()))
                              .map(u => (
                                <tr key={u.id} className="hover:bg-white/3 transition-colors">
                                  <td className="py-3 pl-2 font-medium text-slate-200">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sky-400 text-xs">
                                        {u.name[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-200 flex items-center gap-2">
                                          {u.name}
                                          {u.role === 'admin' && (
                                            <span className="text-[8px] bg-sky-500/10 text-sky-400 border border-sky-400/20 px-1 rounded font-mono">
                                              ADMIN
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">{u.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 text-slate-400">
                                    {new Date(u.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="py-3 text-right font-semibold text-slate-200">
                                    {u.fileCount}
                                  </td>
                                  <td className="py-3 text-right font-mono text-slate-350">
                                    {formatBytes(u.totalSize)}
                                  </td>
                                  <td className="py-3 text-right pr-2">
                                    {u.role !== 'admin' ? (
                                      <button
                                        onClick={() => handleToggleSuspendUser(u.id, u.isSuspended, u.email)}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider cursor-pointer ${
                                          u.isSuspended 
                                            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10'
                                            : 'bg-rose-950/20 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10'
                                        }`}
                                      >
                                        {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-550 italic">Protected</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sub tab content: Outbound Email Log auditing */}
                  {adminActiveSubTab === 'email' && (
                    <div className="glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outbound Security Notification Logs</h4>
                      <div className="overflow-x-auto text-xs min-h-[300px]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-slate-500 uppercase font-semibold">
                              <th className="pb-3 pl-2">Date/Time</th>
                              <th className="pb-3">Recipient</th>
                              <th className="pb-3">Notification Type</th>
                              <th className="pb-3">Delivery Status</th>
                              <th className="pb-3 pr-2">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {adminEmailLogs.map(log => (
                              <tr key={log.id} className="hover:bg-white/3 transition-colors">
                                <td className="py-3 pl-2 text-slate-350 font-mono">
                                  {new Date(log.sentAt).toLocaleString()}
                                </td>
                                <td className="py-3 text-slate-200 font-bold">{log.email}</td>
                                <td className="py-3">
                                  <span className="text-[9px] bg-slate-900 border border-white/5 p-1 rounded font-mono text-slate-350">
                                    {log.type}
                                  </span>
                                </td>
                                <td className="py-3">
                                  <span className={`text-[9px] font-bold uppercase ${log.status === 'SENT' ? 'text-emerald-450' : 'text-rose-455'}`}>
                                    {log.status}
                                  </span>
                                </td>
                                <td className="py-3 pr-2 text-slate-500 font-mono max-w-[200px] truncate" title={log.details}>
                                  {log.details || 'Successfully dispatched.'}
                                </td>
                              </tr>
                            ))}
                            {adminEmailLogs.length === 0 && (
                              <tr>
                                <td colSpan="5" className="py-12 text-center text-slate-550">No outbound notification email history matches.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sub tab content: Security and Auth Audit file log */}
                  {adminActiveSubTab === 'audit' && (
                    <div className="glass-panel rounded-2xl border border-white/5 p-6 glow-card space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-sky-400" /> Security Audit Log File (auth_audit.log)
                      </h4>
                      <div className="bg-slate-950 border border-white/5 rounded-xl p-4 font-mono text-[10px] space-y-2 h-[400px] overflow-y-auto custom-scrollbar">
                        {adminAuditLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-4 border-b border-white/3 pb-2 last:border-0">
                            <span className="text-slate-550 shrink-0">[{log.timestamp}]</span>
                            <span className="text-amber-500 shrink-0 uppercase font-bold">{log.action}</span>
                            <div className="space-y-1">
                              <div className="text-slate-300">
                                IP: <span className="text-sky-400 font-bold">{log.ip}</span> | Error: <span className="text-rose-400">{typeof log.error === 'object' ? JSON.stringify(log.error) : log.error}</span>
                              </div>
                              {log.payload && (
                                <div className="text-slate-500 bg-slate-900/50 p-1.5 rounded border border-white/5">
                                  Payload: {JSON.stringify(log.payload)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {adminAuditLogs.length === 0 && (
                          <div className="text-slate-500 italic py-6 text-center">No authentication violations or lockout actions recorded in audit log.</div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </main>
          </div>
        </div>
      )}

      {/* ================== OVERLAY MODAL: AUTHENTICATION PANELS ================== */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-8 border border-white/5 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => {
                setShowAuthModal(false);
                setOtpSent(false);
                setOtpCode('');
              }}
              className="absolute right-4 top-4 p-1 text-slate-500 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-tr from-sky-400 to-indigo-650 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/10 mb-4 animate-pulse">
                <Cloud className="w-8 h-8 text-slate-950" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {authState === 'login' ? 'Welcome Back' : 
                 authState === 'signup' ? (otpSent ? 'Enter OTP Code' : 'Create Vault') :
                 authState === 'forgot' ? 'Reset Request' : 'Choose Password'}
              </h1>
              <p className="text-slate-400 text-xs mt-1 text-center">
                {authState === 'login' ? 'Unlock your distributed assets storage' : 
                 authState === 'signup' ? (otpSent ? `We sent a 6-digit OTP code to ${email}` : 'Deploy E2E encrypted files') :
                 'Secure single-use token mechanism'}
              </p>
            </div>

            <form onSubmit={otpSent ? handleAuthSubmit : (authState === 'signup' ? handleSendOtp : handleAuthSubmit)} className="space-y-4 text-xs">
              
              {/* Full Name */}
              {authState === 'signup' && !otpSent && (
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              {(authState === 'login' || (authState === 'signup' && !otpSent) || authState === 'forgot') && (
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* OTP Code Entry Screen */}
              {authState === 'signup' && otpSent && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">6-Digit Verification Code</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm text-center font-mono letter-spacing-4 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Didn't receive code?</span>
                    {otpTimer > 0 ? (
                      <span className="text-slate-450 font-bold">Resend in {otpTimer}s</span>
                    ) : (
                      <button 
                        type="button" 
                        onClick={handleSendOtp} 
                        className="text-sky-400 hover:text-sky-305 font-bold cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Forgot Password Reset URL input */}
              {authState === 'reset' && (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Reset Token</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={e => setResetToken(e.target.value)}
                        placeholder="Paste reset token here"
                        className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 rounded-lg glass-input text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Password Fields */}
              {(authState === 'login' || (authState === 'signup' && !otpSent)) && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider">Password</label>
                    {authState === 'login' && (
                      <button
                        type="button"
                        onClick={() => setAuthState('forgot')}
                        className="text-xs text-sky-400 hover:text-sky-350 font-medium cursor-pointer"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-lg glass-input text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Password Strength Meter & Roast Reactions */}
              {((authState === 'signup' && !otpSent) || authState === 'reset') && (
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex justify-between text-[10px] text-slate-450">
                    <span>Password Strength:</span>
                    <span className={`font-bold ${
                      passwordStrength <= 1 ? 'text-rose-500' :
                      passwordStrength === 2 ? 'text-amber-500' :
                      passwordStrength === 3 ? 'text-yellow-400' : 'text-emerald-450'
                    }`}>
                      {passwordStrength <= 1 ? 'Weak' :
                       passwordStrength === 2 ? 'Fair' :
                       passwordStrength === 3 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                  {/* Strength visual bars */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map(idx => (
                      <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx <= passwordStrength 
                            ? (passwordStrength <= 1 ? 'bg-rose-500' :
                               passwordStrength === 2 ? 'bg-amber-500' :
                               passwordStrength === 3 ? 'bg-yellow-450' : 'bg-emerald-500')
                            : 'bg-slate-900'
                        }`} 
                      />
                    ))}
                  </div>
                  {/* Suggestions list */}
                  {passwordSuggestions.length > 0 && (
                    <ul className="text-[9px] text-slate-500 list-disc pl-4 space-y-0.5">
                      {passwordSuggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                    </ul>
                  )}
                  {/* Roast reactions */}
                  {passwordRoast && (
                    <div className="text-[10px] p-2 bg-slate-950/60 rounded border border-white/5 text-slate-400 italic leading-normal">
                      {passwordRoast}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-650 text-slate-950 font-extrabold rounded-lg text-sm transition-all shadow-lg shadow-sky-400/10 disabled:opacity-50 cursor-pointer"
              >
                {authLoading ? 'Loading Security Protocols...' : 
                 authState === 'login' ? 'Sign In to Vault' : 
                 authState === 'signup' ? (otpSent ? 'Verify & Register' : 'Request Verification OTP') :
                 authState === 'forgot' ? 'Request Password Reset Link' : 'Reset Password'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              {authState === 'forgot' && (
                <button
                  type="button"
                  onClick={() => setAuthState('reset')}
                  className="block w-full text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium cursor-pointer"
                >
                  Already have a reset token? Enter here
                </button>
              )}
              
              <button
                onClick={() => {
                  setAuthState(authState === 'login' ? 'signup' : 'login');
                  setOtpSent(false);
                }}
                className="text-xs text-sky-400 hover:text-sky-350 font-medium cursor-pointer"
              >
                {authState === 'login' ? "Don't have an account? Sign up" : 'Return to Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== OVERLAY MODAL: HIGH-SPEED PARALLEL UPLOAD PROGRESS ================== */}
      {uploadState.status !== 'idle' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500/10 rounded-full flex items-center justify-center animate-bounce">
                <UploadCloud className="w-5 h-5 text-sky-400" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200 truncate max-w-[280px]">
                  Uploading {uploadState.filename}
                </h3>
                <p className="text-[9px] text-slate-500 mt-0.5">{formatBytes(uploadState.size)} | Status: <span className="capitalize font-bold text-sky-400">{uploadState.status}</span></p>
              </div>
            </div>

            {/* Error displays */}
            {uploadState.status === 'failed' && (
              <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-lg p-3 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadState.error}</span>
              </div>
            )}

            {/* Parallel Chunks status blocks grid */}
            {uploadState.chunks.length > 0 && (
              <div className="space-y-1.5 border-t border-b border-white/5 py-4">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Parallel Upload Streams ({uploadState.chunks.length} blocks)</div>
                <div className="grid grid-cols-8 gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                  {uploadState.chunks.map((chk, idx) => (
                    <div 
                      key={idx} 
                      className={`h-6 rounded-lg flex items-center justify-center font-mono text-[8px] font-bold border transition-colors ${
                        chk.status === 'completed' ? 'bg-emerald-950/20 text-emerald-450 border-emerald-500/20' :
                        chk.status === 'uploading' ? 'bg-sky-950/20 text-sky-400 border-sky-400/20 animate-pulse' :
                        chk.status === 'failed' ? 'bg-rose-950/20 text-rose-455 border-rose-500/20' :
                        'bg-slate-900 border-white/5 text-slate-600'
                      }`}
                      title={`Chunk #${chk.chunkNumber}: ${chk.progress}%`}
                    >
                      #{chk.chunkNumber}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress metrics */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-sky-400" /> {formatBytes(uploadState.speed)}/s</span>
                <span>ETA: {uploadState.eta}s remaining</span>
              </div>

              {/* Progress visual bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${uploadState.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>Cryptographic stream transfer</span>
                  <span>{uploadState.progress}% Complete</span>
                </div>
              </div>
            </div>

            {/* Action buttons drawer: Pause / Resume / Cancel */}
            <div className="flex gap-3 justify-end">
              {uploadState.status === 'uploading' && (
                <button
                  onClick={handlePauseUpload}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-xs font-bold text-slate-350 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              )}
              {uploadState.status === 'paused' && (
                <button
                  onClick={handleResumeUpload}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
              )}
              <button
                onClick={handleCancelUpload}
                className="px-4 py-2 bg-rose-950/20 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" /> Cancel Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== OVERLAY MODAL: DOWNLOAD STREAM PROGRESS ================== */}
      {downloadingFile && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-full flex items-center justify-center animate-bounce">
                <Download className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200 truncate max-w-[280px]">
                  Downloading {downloadingFile.name}
                </h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Multi-Cloud Re-assembly</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-350">
                <span className="font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-550" /> Pulling Cloud Assets
                </span>
                {downloadingFile.step === 'metadata' || downloadingFile.step === 'pulling' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-violet-450 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-350">
                <span className="font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-550" /> Cryptographic Decryption
                </span>
                {downloadingFile.step === 'decrypting' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-violet-450 animate-spin" />
                ) : downloadingFile.step === 'done' ? (
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                ) : (
                  <span className="text-[9px] text-slate-600">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-355">
                <span className="font-bold flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-550" /> Integrity Verification
                </span>
                {downloadingFile.step === 'done' ? (
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                ) : (
                  <span className="text-[9px] text-slate-600">Pending</span>
                )}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-white/5 rounded-lg p-3 font-mono text-[9px] h-28 overflow-y-auto custom-scrollbar text-slate-500 space-y-1.5">
              {downloadingFile.log.map((line, idx) => (
                <div key={idx} className={
                  line.includes('[FAILOVER]') ? 'text-amber-450' :
                  line.includes('[CRITICAL]') || line.includes('[ERROR]') ? 'text-rose-455' :
                  'text-slate-450'
                }>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
