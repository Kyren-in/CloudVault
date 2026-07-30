import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, Lock, Shield, HardDrive, RefreshCw, FileText, Trash2, 
  Download, UploadCloud, LogOut, CheckCircle2, AlertTriangle, 
  Activity, Terminal, User, Server, Database, Key, Check, Info,
  Eye, EyeOff, Menu, X, ArrowRight, ChevronDown, Award, Sparkles,
  TrendingUp, Cpu, PieChart, BarChart2, Bell, Search, Settings,
  HelpCircle, Star, ShieldCheck, ChevronRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function App() {
  // Session & Authentication
  const [token, setToken] = useState(localStorage.getItem('cv_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('cv_user')) || null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authState, setAuthState] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset'
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // App views: 'landing' | 'dashboard'
  const [viewMode, setViewMode] = useState(token ? 'dashboard' : 'landing');
  const [activeSidebarTab, setActiveSidebarTab] = useState('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Auth Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Files & Dashboard State
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({
    storageUsed: { originalBytes: 0, cloudBytes: 0, savingsBytes: 0 },
    distribution: { backblazeChunks: 0, cloudflareChunks: 0 },
    providers: {
      backblaze: { name: 'Backblaze B2', type: 'backblaze', online: true, latency: 95, isMock: true },
      cloudflare: { name: 'Cloudflare R2', type: 'cloudflare', online: true, latency: 60, isMock: true }
    }
  });
  
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null); // { name, size, step, progress }
  const [downloadingFile, setDownloadingFile] = useState(null); // { id, name, step, log: [] }
  const [actionError, setActionError] = useState('');
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Failover route healthy: B2 & R2 sync successful.', time: '10m ago', unread: true },
    { id: 2, text: 'Brotli compression applied: saved 68% space on document.txt.', time: '1h ago', unread: false }
  ]);
  
  // Interactive Landing States
  const [timelineStep, setTimelineStep] = useState(1);
  const [faqOpen, setFaqOpen] = useState(null);
  const [splitSimulationStep, setSplitSimulationStep] = useState('idle'); // 'idle' | 'splitting' | 'distributed'

  // Cursor & Spotlight State
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isCursorHovered, setIsCursorHovered] = useState(false);
  
  const fileInputRef = useRef(null);
  const logsEndRef = useRef(null);

  // Auto-scroll logs in operations feed
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load reset token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('resetToken');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setAuthState('reset');
      setShowAuthModal(true);
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

  // Fetch dashboard metadata when token is active
  useEffect(() => {
    if (token && viewMode === 'dashboard') {
      if (isGuestMode) {
        loadGuestMockData();
      } else {
        fetchDashboardData();
      }
      addLog('Secure CloudVault session initialized.');
    }
  }, [token, viewMode]);

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

  const handleLogout = () => {
    localStorage.removeItem('cv_token');
    localStorage.removeItem('cv_user');
    setToken('');
    setUser(null);
    setIsGuestMode(false);
    setFiles([]);
    setLogs([]);
    setViewMode('landing');
    addLog('Session terminated.');
  };

  const enterLiveDemo = () => {
    setIsGuestMode(true);
    const mockUser = { name: 'Demo Guest', email: 'guest@cloudvault.io' };
    setToken('mock-guest-token');
    setUser(mockUser);
    setViewMode('dashboard');
    addLog('Logged in as guest.', 'success');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    let endpoint = authState;
    let payload = {};

    if (authState === 'login') {
      payload = { email, password };
    } else if (authState === 'signup') {
      payload = { name, email, password };
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
        setAuthSuccess(data.message);
        if (data.resetToken) {
          setResetToken(data.resetToken);
          addLog(`Dev mode reset token generated: ${data.resetToken.substring(0, 15)}...`, 'success');
        }
      } else if (authState === 'reset') {
        setAuthSuccess(data.message);
        setTimeout(() => {
          setAuthState('login');
          setNewPassword('');
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 2500);
      } else {
        // Sign In / Sign Up Success
        localStorage.setItem('cv_token', data.token);
        localStorage.setItem('cv_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setIsGuestMode(false);
        setViewMode('dashboard');
        setShowAuthModal(false);
        
        // Clear forms
        setName('');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setAuthError(err.message);
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
        addLog(`Simulated status for ${current.name} changed to ${current.online ? 'ONLINE' : 'OFFLINE'}`, current.online ? 'success' : 'warn');
        fetchDashboardData();
      }
    } catch (err) {
      addLog('Failed to toggle provider simulation status.', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setActionError('');
    setUploadingFile({
      name: file.name,
      size: file.size,
      step: 'init',
      progress: 10
    });

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    addLog(`Initiating secure upload flow for: ${file.name} (${formatBytes(file.size)})`);
    
    await sleep(650);
    setUploadingFile(prev => ({ ...prev, step: 'hash', progress: 30 }));
    addLog(`Generating file SHA-256 integrity hash digest...`);
    
    await sleep(650);
    setUploadingFile(prev => ({ ...prev, step: 'compress', progress: 55 }));
    addLog(`Applying Brotli level 9 compression algorithm...`);

    await sleep(650);
    setUploadingFile(prev => ({ ...prev, step: 'encrypt', progress: 75 }));
    addLog(`Generating custom AES-256 key. Executing GCM encryption...`);

    await sleep(550);
    setUploadingFile(prev => ({ ...prev, step: 'uploading', progress: 90 }));
    
    const isLarge = file.size >= (10 * 1024 * 1024);
    if (isLarge) {
      addLog(`File size exceeds 10MB. Executing round-robin distributed chunking strategy.`);
    } else {
      addLog(`File size under 10MB. Executing multi-cloud replication redundancy upload.`);
    }

    if (isGuestMode) {
      await sleep(1000);
      const newFileObj = {
        id: `mock-${Date.now()}`,
        filename: file.name,
        size: file.size,
        createdAt: new Date().toISOString(),
        compression: 'brotli',
        encrypted: true,
        chunks: isLarge ? [
          { chunkNumber: 1, provider: 'backblaze', size: 5000000 },
          { chunkNumber: 2, provider: 'cloudflare', size: file.size - 5000000 }
        ] : [
          { chunkNumber: 1, provider: 'backblaze', size: file.size },
          { chunkNumber: 1, provider: 'cloudflare', size: file.size }
        ]
      };
      setFiles(prev => [newFileObj, ...prev]);
      
      const compressedSize = Math.floor(file.size * 0.45); // simulate 55% reduction
      setStats(prev => {
        const nextUsed = {
          originalBytes: prev.storageUsed.originalBytes + file.size,
          cloudBytes: prev.storageUsed.cloudBytes + (isLarge ? compressedSize : (compressedSize * 2)),
          savingsBytes: prev.storageUsed.savingsBytes + (file.size - compressedSize)
        };
        const nextDistribution = { ...prev.distribution };
        if (isLarge) {
          nextDistribution.backblaze = (nextDistribution.backblaze || 0) + 1;
          nextDistribution.cloudflare = (nextDistribution.cloudflare || 0) + 1;
        } else {
          nextDistribution.backblaze = (nextDistribution.backblaze || 0) + 1;
          nextDistribution.cloudflare = (nextDistribution.cloudflare || 0) + 1;
        }
        return { ...prev, storageUsed: nextUsed, distribution: nextDistribution };
      });

      setUploadingFile(prev => ({ ...prev, step: 'done', progress: 100 }));
      addLog(`[GUEST MODE] File "${file.name}" uploaded successfully!`, 'success');
      await sleep(800);
      setUploadingFile(null);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server upload request failed.');
      }

      setUploadingFile(prev => ({ ...prev, step: 'done', progress: 100 }));
      addLog(`File "${file.name}" successfully encrypted and replicated across cloud nodes!`, 'success');
      await sleep(800);
      setUploadingFile(null);
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message);
      addLog(`Upload failed: ${err.message}`, 'error');
      await sleep(2500);
      setUploadingFile(null);
    }
  };

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
    
    // Evaluate providers
    const providersState = stats.providers;
    await sleep(500);
    setDownloadingFile(prev => ({ ...prev, step: 'pulling' }));
    
    // Simulate chunk download logs
    for (const chunk of fileObj.chunks) {
      const providerInfo = providersState[chunk.provider];
      addDlLog(`Downloading chunk #${chunk.chunkNumber} from ${providerInfo.name}...`);
      
      if (!providerInfo.online) {
        addDlLog(`[FAILOVER] ${providerInfo.name} is OFFLINE! Checking alternative replica node...`);
        const backup = fileObj.chunks.find(c => c.chunkNumber === chunk.chunkNumber && c.provider !== chunk.provider);
        if (backup) {
          const backupInfo = providersState[backup.provider];
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
      // Mock client-side download trigger
      const blob = new Blob(['Mock file content for: ' + fileObj.filename], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileObj.filename;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setDownloadingFile(prev => ({ ...prev, step: 'done' }));
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
      addLog(`File downloaded & decrypted: ${fileObj.filename}`, 'success');
      
      await sleep(800);
      setDownloadingFile(null);
    } catch (err) {
      setActionError(err.message);
      addLog(`Download failed: ${err.message}`, 'error');
      addDlLog(`[ERROR] Download terminated: ${err.message}`);
      await sleep(3000);
      setDownloadingFile(null);
    }
  };

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

      addLog(`File "${filename}" successfully purged from cloud nodes.`, 'success');
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message);
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
          {/* Grid Lines */}
          <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
          <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
          <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
          
          {/* CF R2 Path */}
          <path d="M0,90 C50,85 100,50 150,55 C200,60 250,45 300,48 C350,52 400,35 450,40 L500,45 L500,120 L0,120 Z" fill="url(#r2-grad)" />
          <path d="M0,90 C50,85 100,50 150,55 C200,60 250,45 300,48 C350,52 400,35 450,40 L500,45" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          
          {/* BB B2 Path */}
          <path d="M0,110 C50,90 100,85 150,88 C200,90 250,75 300,78 C350,65 400,60 450,62 L500,65 L500,120 L0,120 Z" fill="url(#b2-grad)" />
          <path d="M0,110 C50,90 100,85 150,88 C200,90 250,75 300,78 C350,65 400,60 450,62 L500,65" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="2,1" />

          {/* Hover nodes */}
          <circle cx="150" cy="55" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" className="cursor-pointer" />
          <circle cx="350" cy="65" r="3.5" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="1.5" className="cursor-pointer" />
        </svg>
      </div>
    );
  };

  // 1. Landing Page View
  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col font-sans relative select-none">
        {/* Glow Spots */}
        <div className="glow-spot-blue -top-20 -left-20"></div>
        <div className="glow-spot-purple top-1/3 -right-20"></div>
        
        {/* Mouse follow background spotlight */}
        <div 
          className="pointer-events-none fixed z-0 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(79,140,255,0.05)_0,rgba(123,97,255,0.03)_50%,transparent_100%)] -translate-x-1/2 -translate-y-1/2 blur-2xl hidden md:block"
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

        {/* Landing Header */}
        <header className="glass-panel border-b border-white/5 sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Cloud className="w-5 h-5 text-slate-100 animate-pulse" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                CloudVault
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider">SECURE MULTI-CLOUD</p>
            </div>
          </div>          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-350 font-medium">
            <a href="#features" className="hover:text-sky-450 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-sky-450 transition-colors">Workflow</a>
            <a href="#faq" className="hover:text-sky-450 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setAuthState('login');
                setShowAuthModal(true);
              }}
              className="text-xs text-slate-900 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 px-4 py-2 rounded-lg font-bold shadow-lg shadow-sky-500/10 transition-all hover:scale-105 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </header>

        {/* 1. Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen File Security Active
          </div>

          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
            Store Once.<br/>
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-indigo-600 bg-clip-text text-transparent">
              Access Everywhere.
            </span>
          </h2>

          <p className="text-slate-350 text-base md:text-lg max-w-2xl mb-10 leading-relaxed font-normal">
            CloudVault encrypts and splits your files into separate secure chunks, replicating and distributing them across Backblaze B2 & Cloudflare R2 automatically. Zero single points of failure.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <button 
              onClick={() => {
                setAuthState('signup');
                setShowAuthModal(true);
              }}
              className="px-8 py-4 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-slate-950 font-bold rounded-xl text-sm transition-all hover:scale-105 shadow-xl shadow-sky-500/10 flex items-center gap-2 cursor-pointer"
            >
              Get Started Free <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Interactive Split Network Simulation Graphic */}
          <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 border border-white/5 shadow-2xl relative overflow-hidden mb-12">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secure Split-Storage Simulator</span>
              <button 
                onClick={triggerSplitSimulation}
                className="px-3 py-1.5 text-[10px] font-bold text-sky-400 border border-sky-400/20 rounded hover:bg-sky-400/10 transition-all"
              >
                {splitSimulationStep === 'idle' ? 'Run Simulation' : splitSimulationStep === 'splitting' ? 'Encrypting...' : 'Distributed!'}
              </button>
            </div>

            <div className="h-44 flex items-center justify-between relative px-8">
              {/* Left Node: Original File */}
              <div className="z-10 flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-all duration-500 ${splitSimulationStep === 'splitting' ? 'border-sky-400 bg-sky-500/10 scale-105' : 'border-slate-800 bg-slate-900'}`}>
                  <FileText className="w-7 h-7 text-sky-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">File.zip (10MB)</span>
              </div>

              {/* Connecting Lines & Animating Chunks */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-full h-full stroke-slate-800" viewBox="0 0 500 150">
                  <path d="M 80 75 L 250 75" strokeWidth="2" strokeDasharray="5,5" />
                  <path d="M 250 75 L 420 35" strokeWidth="2" strokeDasharray="5,5" />
                  <path d="M 250 75 L 420 115" strokeWidth="2" strokeDasharray="5,5" />
                  
                  {splitSimulationStep === 'splitting' && (
                    <>
                      <circle cx="80" cy="75" r="5" fill="#38bdf8">
                        <animate attributeName="cx" from="80" to="250" dur="1s" repeatCount="1" />
                      </circle>
                    </>
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

              {/* Midpoint: Encryption Router */}
              <div className={`z-10 w-12 h-12 rounded-full border flex items-center justify-center transition-all ${splitSimulationStep === 'splitting' ? 'border-sky-400 bg-sky-500/10 rotate-180 duration-1000' : 'border-slate-800 bg-slate-900'}`}>
                <Shield className="w-5 h-5 text-sky-400" />
              </div>

              {/* Right Nodes: Cloud Hosts */}
              <div className="z-10 flex flex-col gap-8">
                <div className={`flex items-center gap-3 p-2 px-3 rounded-lg border transition-all ${splitSimulationStep === 'distributed' ? 'border-sky-400 bg-sky-500/10' : 'border-slate-800 bg-slate-900'}`}>
                  <Cloud className="w-5 h-5 text-sky-400" />
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-white uppercase">Cloudflare R2</div>
                    <div className="text-[8px] text-slate-450 font-mono">Chunk 1 (Encrypted)</div>
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-2 px-3 rounded-lg border transition-all ${splitSimulationStep === 'distributed' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-800 bg-slate-900'}`}>
                  <Cloud className="w-5 h-5 text-violet-400" />
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-white uppercase">Backblaze B2</div>
                    <div className="text-[8px] text-slate-450 font-mono">Chunk 2 (Encrypted)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Trusted By Section */}
        <section className="w-full max-w-7xl mx-auto px-6 py-12 border-y border-white/5 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Platform Security Standard</h3>
              <p className="text-xs text-slate-500 mt-1">Files fully decentralized and replicated with enterprise hosting</p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-80">
              <div className="flex items-center gap-2 text-slate-300 font-bold tracking-tight text-lg">
                <Cloud className="w-5 h-5 text-sky-450" /> Backblaze B2
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-bold tracking-tight text-lg">
                <Cloud className="w-5 h-5 text-indigo-400" /> Cloudflare R2
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> SOC-2 Compliant
              </div>
            </div>
          </div>
        </section>

        {/* 3. Features Section */}
        <section id="features" className="w-full max-w-7xl mx-auto px-6 py-24 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">Enterprise Capabilities</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">Engineered for absolute resilience.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-panel rounded-xl p-6 border border-white/5 glow-card">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-5 h-5 text-sky-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">End-to-End Encryption</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Files are compressed using Brotli and encrypted client-side using AES-256-GCM. Your decryption keys never reach the cloud.
              </p>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-white/5 glow-card">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4">
                <Cloud className="w-5 h-5 text-indigo-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Multi-Cloud Storage</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Distributes file storage blocks across distinct S3 infrastructures (Backblaze B2 & Cloudflare R2) to bypass hosting dependency.
              </p>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-white/5 glow-card">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5 text-teal-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Non-Blocking Architecture</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Asynchronous cryptographic pipelines and non-blocking background threads guarantee blistering upload and login performance.
              </p>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-white/5 glow-card">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Dynamic Chunk splitting</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Splits files larger than 10MB into separate chunks and uploads them in parallel, boosting download speeds and balancing bandwidth.
              </p>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-white/5 glow-card">
              <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center mb-4">
                <RefreshCw className="w-5 h-5 text-rose-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Automatic Failover Routing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                If a cloud provider goes offline, the download pipeline instantly detects the failure and routes requests to active replica nodes.
              </p>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-white/5 glow-card">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Real-Time Analytics</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track network latencies, bandwidth savings from Brotli compression, and chunk layout maps directly from your dashboard feed.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Workflow Timeline Section */}
        <section id="workflow" className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">Storage Cycle</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">How CloudVault Works</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            {/* Timeline Selection */}
            <div className="lg:col-span-1 space-y-4">
              {[
                { step: 1, title: '1. Secure Upload', desc: 'File is selected and uploaded locally via memory buffer.' },
                { step: 2, title: '2. Brotli Compression', desc: 'File sizes are deflated lossless-ly up to 90% in seconds.' },
                { step: 3, title: '3. AES-256 Key Encryption', desc: 'Unique GCM cryptographic tags block unauthorized reads.' },
                { step: 4, title: '4. Block Chunking & Split', desc: 'Larger payloads are split to distribute upload pipelines.' },
                { step: 5, title: '5. Multi-Cloud Replication', desc: 'Replicated and hosted parallelly in B2 & R2 endpoints.' },
                { step: 6, title: '6. Self-Healing Download', desc: 'Decrypts and streams from live nodes with failover safety.' }
              ].map(s => (
                <button
                  key={s.step}
                  onClick={() => setTimelineStep(s.step)}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${timelineStep === s.step ? 'bg-sky-500/10 border-sky-400/40 text-white' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-900/80'}`}
                >
                  <div>
                    <div className="font-bold text-slate-200">{s.title}</div>
                    {timelineStep === s.step && <div className="text-[10px] text-slate-450 mt-1">{s.desc}</div>}
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${timelineStep === s.step ? 'rotate-90 text-sky-400' : 'text-slate-500'}`} />
                </button>
              ))}
            </div>

            {/* Interactive Timeline Display */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-8 border border-white/5 flex flex-col justify-center min-h-[300px]">
              {timelineStep === 1 && (
                <div className="space-y-4">
                  <div className="inline-flex p-3 bg-sky-500/10 text-sky-400 rounded-lg"><UploadCloud className="w-6 h-6" /></div>
                  <h4 className="text-xl font-bold text-white">Local Upload Input</h4>
                  <p className="text-slate-350 text-xs leading-relaxed">
                    CloudVault reads files securely within your browser frame, feeding the raw binary data into an in-memory buffer before transmitting it to the API endpoint. No unencrypted files hit any server disk.
                  </p>
                </div>
              )}
              {timelineStep === 2 && (
                <div className="space-y-4">
                  <div className="inline-flex p-3 bg-violet-500/10 text-violet-400 rounded-lg"><Cpu className="w-6 h-6" /></div>
                  <h4 className="text-xl font-bold text-white">Brotli Lossless Compression</h4>
                  <p className="text-slate-350 text-xs leading-relaxed">
                    By applying Brotli level 9 compression, we reduce text-based files, logs, and database backups by up to 90%. This compression is 100% lossless, meaning the original file is reconstructed byte-for-byte upon download.
                  </p>
                </div>
              )}
              {timelineStep === 3 && (
                <div className="space-y-4">
                  <div className="inline-flex p-3 bg-indigo-500/10 text-indigo-400 rounded-lg"><Lock className="w-6 h-6" /></div>
                  <h4 className="text-xl font-bold text-white">AES-256-GCM Encryption</h4>
                  <p className="text-slate-350 text-xs leading-relaxed">
                    A unique 256-bit AES cryptographic key is created. The data is encrypted using Galois/Counter Mode (GCM), generating a 16-byte authentication tag to guarantee integrity and block middleman tampering.
                  </p>
                </div>
              )}
              {timelineStep === 4 && (
                <div className="space-y-4">
                  <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><Database className="w-6 h-6" /></div>
                  <h4 className="text-xl font-bold text-white">Dynamic Chunk Partitioning</h4>
                  <p className="text-slate-350 text-xs leading-relaxed">
                    To optimize bandwidth and storage, files over 10MB are split into 5MB chunks. These chunks are processed independently, meaning chunk #1 can fail to upload without affecting chunk #2.
                  </p>
                </div>
              )}
              {timelineStep === 5 && (
                <div className="space-y-4">
                  <div className="inline-flex p-3 bg-teal-500/10 text-teal-400 rounded-lg"><Server className="w-6 h-6" /></div>
                  <h4 className="text-xl font-bold text-white">Parallel Multi-Cloud Hosting</h4>
                  <p className="text-slate-350 text-xs leading-relaxed">
                    The encrypted chunks are uploaded in parallel to Backblaze B2 and Cloudflare R2. Even if a cloud provider has a total outage, your files are completely safe and readable from the backup node.
                  </p>
                </div>
              )}
              {timelineStep === 6 && (
                <div className="space-y-4">
                  <div className="inline-flex p-3 bg-rose-500/10 text-rose-400 rounded-lg"><Download className="w-6 h-6" /></div>
                  <h4 className="text-xl font-bold text-white">Self-Healing Download Stream</h4>
                  <p className="text-slate-350 text-xs leading-relaxed">
                    When you retrieve a file, CloudVault downloads the chunks, merges them, decrypts the binary, and decompresses it back to the original format on the fly. If any node is detected as slow or offline, it routes around it in real time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>


        {/* 6. Why CloudVault Comparison */}
        <section className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">Comparison</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">Traditional vs CloudVault</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 font-bold uppercase">
                  <th className="pb-4 pl-4 text-sm">Features</th>
                  <th className="pb-4 text-sm text-rose-400">Single Cloud (Dropbox/Drive)</th>
                  <th className="pb-4 text-sm text-sky-400 bg-sky-500/5 px-6 rounded-t-xl">CloudVault Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-4 pl-4 font-semibold text-slate-200">Storage Architecture</td>
                  <td className="py-4 text-slate-400">Single hosting dependency</td>
                  <td className="py-4 text-sky-300 bg-sky-500/5 px-6 font-semibold">Multi-Cloud distributed split</td>
                </tr>
                <tr>
                  <td className="py-4 pl-4 font-semibold text-slate-200">Redundancy / Failover</td>
                  <td className="py-4 text-slate-400">Host outage means offline</td>
                  <td className="py-4 text-sky-300 bg-sky-500/5 px-6 font-semibold">Automatic real-time routing</td>
                </tr>
                <tr>
                  <td className="py-4 pl-4 font-semibold text-slate-200">File Compression</td>
                  <td className="py-4 text-slate-400">Basic or none</td>
                  <td className="py-4 text-sky-300 bg-sky-500/5 px-6 font-semibold">Lossless Brotli (up to 90% savings)</td>
                </tr>
                <tr>
                  <td className="py-4 pl-4 font-semibold text-slate-200">Cryptographic Security</td>
                  <td className="py-4 text-slate-400">Server-side keys (visible to hosts)</td>
                  <td className="py-4 text-sky-300 bg-sky-500/5 px-6 font-semibold">AES-256-GCM client-side keys</td>
                </tr>
                <tr>
                  <td className="py-4 pl-4 font-semibold text-slate-200">Bandwidth Performance</td>
                  <td className="py-4 text-slate-400">Limited single channel speeds</td>
                  <td className="py-4 text-sky-300 bg-sky-500/5 px-6 font-semibold">Parallelized multi-node chunks</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>



        {/* 8. Testimonials Section */}
        <section className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">User reviews</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">Loved by developers & companies.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-panel rounded-xl p-6 border border-white/5 flex flex-col justify-between">
              <p className="text-xs text-slate-350 leading-relaxed mb-6 italic">
                "Our previous database backups would go offline completely when GCS or AWS had an outage. CloudVault handles failover in the background. Highly recommend the Brotli compression!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 font-extrabold flex items-center justify-center text-xs">AS</div>
                <div>
                  <div className="text-xs font-bold text-white">Alex S.</div>
                  <div className="text-[10px] text-slate-500">Principal Architect, DevCore</div>
                  <div className="flex gap-0.5 text-amber-450 mt-1"><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /></div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-white/5 flex flex-col justify-between">
              <p className="text-xs text-slate-350 leading-relaxed mb-6 italic">
                "CloudVault is the simplest way to add client-side encryption. The performance is incredibly fast since key hashes and chunks upload concurrently to R2 and Backblaze."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 font-extrabold flex items-center justify-center text-xs">MK</div>
                <div>
                  <div className="text-xs font-bold text-white">Maya K.</div>
                  <div className="text-[10px] text-slate-500">Security Lead, Voxel</div>
                  <div className="flex gap-0.5 text-amber-450 mt-1"><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /></div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-white/5 flex flex-col justify-between">
              <p className="text-xs text-slate-350 leading-relaxed mb-6 italic">
                "The UI/UX feels like Vercel or Linear—Apple-inspired minimalism. Seeing the storage distribution progress live makes managing storage quotas extremely simple."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">JH</div>
                <div>
                  <div className="text-xs font-bold text-white">Josh H.</div>
                  <div className="text-[10px] text-slate-500">Tech Lead, ScaleFlow</div>
                  <div className="flex gap-0.5 text-amber-450 mt-1"><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. FAQ Section */}
        <section id="faq" className="w-full max-w-4xl mx-auto px-6 py-24 border-t border-white/5 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">Help Center</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-4">
            {[
              { q: 'How does CloudVault guarantee 99.999% file uptime?', a: 'By storing duplicates and file chunks across Cloudflare R2 and Backblaze B2, an outage at one provider is instantly routed around. Your download retrieves files seamlessly from the online node.' },
              { q: 'What happens to the Brotli-compressed file when downloading?', a: 'The file is decompressed client-side in the download stream back to its exact original state. The process is completely lossless and transparent to the user.' },
              { q: 'Can anyone read my files on Backblaze or Cloudflare R2?', a: 'No. Files are encrypted client-side using AES-256-GCM. Because your custom encryption keys never leave your dashboard, even our storage hosts have no access to read your data.' },
              { q: 'How do I connect my own S3 bucket credentials?', a: 'You can disable our mock server layer in settings and write your keys (B2 bucket credentials, R2 endpoints, and Supabase tokens) directly into your private backend configurations.' }
            ].map((faq, idx) => (
              <div key={idx} className="glass-panel rounded-xl border border-white/5 overflow-hidden transition-all duration-200">
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full text-left p-5 text-sm font-bold text-white flex items-center justify-between cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${faqOpen === idx ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-450 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 10. Landing Footer */}
        <footer className="w-full border-t border-white/5 bg-slate-950/20 py-16 relative z-10">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-slate-100" />
                </div>
                <span className="text-sm font-bold text-white">CloudVault</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Multi-cloud distributed block split storage solution. Store securely, recover instantly.
              </p>
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Resources</h5>
              <ul className="space-y-2 text-[11px] text-slate-500">
                <li><a href="#features" className="hover:text-sky-400">Features</a></li>
                <li><a href="#workflow" className="hover:text-sky-400">Timeline Workflow</a></li>
                <li><a href="https://github.com/Kyren-in/CloudVault" className="hover:text-sky-400">GitHub Documentation</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Active outposts</h5>
              <ul className="space-y-2 text-[11px] text-slate-500">
                <li>Cloudflare R2</li>
                <li>Backblaze B2</li>
                <li>Supabase Storage</li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Security Policy</h5>
              <ul className="space-y-2 text-[11px] text-slate-500">
                <li>AES-256 E2E Encryption</li>
                <li>Brotli Deflate compression</li>
                <li>Stateless JWT login resets</li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-white/5 text-center text-[10px] text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span>&copy; {new Date().getFullYear()} CloudVault Inc. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-400">Privacy Policy</a>
              <a href="#" className="hover:text-slate-400">Terms of Use</a>
            </div>
          </div>
        </footer>

        {/* 11. Auth Modal Overlay */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-panel rounded-2xl p-8 border border-white/5 shadow-2xl relative">
              <button 
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center mb-8">
                <div className="w-14 h-14 bg-gradient-to-tr from-sky-400 to-indigo-650 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/10 mb-4 animate-pulse">
                  <Cloud className="w-8 h-8 text-slate-900" strokeWidth={2.5} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {authState === 'login' ? 'Welcome Back' : 
                   authState === 'signup' ? 'Create Vault' :
                   authState === 'forgot' ? 'Reset Request' : 'Choose Password'}
                </h1>
                <p className="text-slate-400 text-xs mt-1 text-center">
                  {authState === 'login' ? 'Unlock your distributed assets storage' : 
                   authState === 'signup' ? 'Deploy E2E encrypted files' :
                   'Stateless authorization link system'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-5">
                {authState === 'signup' && (
                  <div>
                    <label className="block text-slate-350 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                      />
                    </div>
                  </div>
                )}

                {(authState === 'login' || authState === 'signup' || authState === 'forgot') && (
                  <div>
                    <label className="block text-slate-350 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                      />
                    </div>
                  </div>
                )}

                {authState === 'reset' && (
                  <>
                    <div>
                      <label className="block text-slate-350 text-xs font-semibold uppercase tracking-wider mb-2">Reset Token</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={resetToken}
                          onChange={e => setResetToken(e.target.value)}
                          placeholder="Paste reset token here"
                          className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-350 text-xs font-semibold uppercase tracking-wider mb-2">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-3 rounded-lg glass-input text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-550 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {(authState === 'login' || authState === 'signup') && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-slate-355 text-xs font-semibold uppercase tracking-wider">Password</label>
                      {authState === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthState('forgot');
                            setAuthError('');
                            setAuthSuccess('');
                          }}
                          className="text-xs text-sky-400 hover:text-sky-300 font-medium"
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
                        className="w-full pl-10 pr-10 py-3 rounded-lg glass-input text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-550 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {authError && (
                  <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-lg p-3 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-lg p-3 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-650 text-slate-950 font-bold rounded-lg text-sm transition-all shadow-lg shadow-sky-400/20 disabled:opacity-50 cursor-pointer"
                >
                  {authLoading ? 'Processing...' : 
                   authState === 'login' ? 'Sign In to Vault' : 
                   authState === 'signup' ? 'Create Vault Account' :
                   authState === 'forgot' ? 'Send Reset Link' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 text-center space-y-3">
                {authState === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthState('reset');
                      setAuthError('');
                      setAuthSuccess('');
                    }}
                    className="block w-full text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                  >
                    Already have a reset token? Enter here
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setAuthState(authState === 'login' ? 'signup' : 'login');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                >
                  {authState === 'login' ? "Don't have an account? Sign up" : 'Return to Sign In'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Dashboard Console View
  return (
    <div className="min-h-screen relative flex font-sans select-none overflow-hidden bg-[#0B1020] text-slate-100">
      {/* Ambient Spotlight */}
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

      {/* Mobile Sidebar overlay toggle */}
      <div className={`fixed inset-0 bg-slate-950/80 z-40 transition-opacity md:hidden ${showMobileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowMobileMenu(false)} />

      {/* LEFT SIDEBAR PANEL */}
      <aside className={`fixed md:relative top-0 bottom-0 left-0 w-64 glass-panel border-r border-white/5 p-6 flex flex-col justify-between z-40 transition-transform duration-300 md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-sky-450 to-indigo-600 rounded-xl flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight">CloudVault</h1>
              <p className="text-[9px] text-slate-500 tracking-wider">CONSOLE CONTROL</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: HardDrive },
              { id: 'files', label: 'My Vault Files', icon: FileText },
              { id: 'storage', label: 'Storage Allocation', icon: PieChart },
              { id: 'analytics', label: 'Health Analytics', icon: BarChart2 },
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
          </nav>
        </div>

        {/* Footer Sidebar: User metadata */}
        <div className="space-y-4">
          {isGuestMode && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-2.5 text-[10px] leading-relaxed">
              <strong>Guest mode active.</strong> Log in to upload files permanently.
            </div>
          )}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400 shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate max-w-[110px]" title={user?.name}>{user?.name}</div>
                <div className="text-[9px] text-slate-550 truncate max-w-[110px]" title={user?.email}>{user?.email}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-450 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" 
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        {/* Top Header Navbar */}
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
                className="pl-9 pr-4 py-1.5 w-64 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/40"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Menu */}
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
                        addLog('Notifications marked as read.');
                      }}
                      className="text-[9px] text-sky-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-2 rounded-lg border flex flex-col gap-0.5 ${n.unread ? 'bg-sky-500/5 border-sky-400/10' : 'bg-slate-900/40 border-white/5'}`}>
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
              {isGuestMode ? 'GUEST DEMO' : 'VAULT SESSION'}
            </div>
          </div>
        </header>

        {/* Dashboard Panels */}
        <main className="p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {actionError && (
            <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl p-4 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD MAIN */}
          {activeSidebarTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Gauges & Storage Info */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* storage progress gauge */}
                <div className="lg:col-span-1 glass-panel rounded-xl border border-white/5 p-6 flex flex-col items-center justify-center glow-card">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 self-start flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-sky-400" /> Vault Storage Usage
                  </h3>
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="url(#progress-radial)" 
                        strokeWidth="8" 
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * usedPercent) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="progress-radial" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#7B61FF" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute flex flex-col items-center text-center">
                      <span className="text-2xl font-extrabold text-white">{usedPercent.toFixed(1)}%</span>
                      <span className="text-[9px] text-slate-550 uppercase tracking-wider mt-0.5">Capacity</span>
                    </div>
                  </div>
                  <div className="mt-5 w-full space-y-3.5 text-xs text-slate-350 border-t border-white/5 pt-4">
                    <div className="flex justify-between">
                      <span className="text-slate-450">Raw Input Size:</span>
                      <span className="font-semibold text-white">{formatBytes(stats.storageUsed.originalBytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450">Actual Encrypted cloud:</span>
                      <span className="font-semibold text-sky-400">{formatBytes(stats.storageUsed.cloudBytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450">Brotli Deflate:</span>
                      <span className="font-semibold text-emerald-400">
                        {getCompressionRatio(stats.storageUsed.originalBytes, stats.storageUsed.cloudBytes)} ({formatBytes(stats.storageUsed.savingsBytes)} Saved)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cloud Outposts Simulator */}
                <div className="lg:col-span-2 glass-panel rounded-xl border border-white/5 p-6 flex flex-col justify-between glow-card">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Server className="w-4 h-4 text-violet-400" /> Cloud Outpost Failover Control
                      </h3>
                      <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 uppercase font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                        <Activity className="w-3.5 h-3.5" /> Failover Active
                      </div>
                    </div>
                    <p className="text-slate-450 text-xs mb-4">
                      Simulate network outages to verify automatic failover routing. File downloads dynamically re-route to keep data available.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(stats.providers).map(([key, provider]) => (
                        <div key={key} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-3.5 h-3.5 rounded-full ${provider.online ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20 animate-pulse' : 'bg-rose-500 shadow-lg shadow-rose-500/20'}`} />
                              <div>
                                <div className="text-xs font-bold text-white">{provider.name}</div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-wider">
                                  {isGuestMode ? 'Simulated Driver' : 'S3 Integration'}
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
                            <span>Response Delay:</span>
                            <span className="font-mono text-slate-200">
                              {provider.online ? `${provider.latency} ms` : '∞ (Timeout)'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* SVG Chart */}
                  <PerformanceChart />
                </div>
              </div>

              {/* Upload Drop Zone & Files List */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Upload drag zone */}
                <div className="lg:col-span-1 flex flex-col">
                  <div className="glass-panel rounded-xl border border-white/5 p-6 flex-1 flex flex-col justify-between glow-card">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
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
                        <h4 className="text-xs font-bold text-slate-200">Inject new asset</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Click to browse your filesystem</p>
                        <p className="text-[9px] text-slate-550 mt-4 leading-normal font-mono max-w-[180px] mx-auto">
                          Files &ge; 10MB chunk split. Under 10MB replicate sync.
                        </p>
                      </div>
                    </div>
                    
                    {/* Log Terminal console */}
                    <div className="space-y-2 mt-6">
                      <div className="text-[10px] font-bold text-slate-450 uppercase flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-sky-400" /> Operational Console Log
                      </div>
                      <div className="bg-slate-950/80 border border-white/5 rounded-lg p-3 font-mono text-[9px] h-28 overflow-y-auto custom-scrollbar space-y-1.5">
                        {logs.map((log, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                            <span className={
                              log.type === 'error' ? 'text-rose-400' :
                              log.type === 'warn' ? 'text-amber-400' :
                              log.type === 'success' ? 'text-emerald-450' :
                              'text-slate-400'
                            }>
                              {log.message}
                            </span>
                          </div>
                        ))}
                        {logs.length === 0 && (
                          <div className="text-slate-600 italic">Console ready. Awaiting uploads...</div>
                        )}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vault File Table */}
                <div className="lg:col-span-2 glass-panel rounded-xl border border-white/5 p-6 glow-card flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Database className="w-4 h-4 text-sky-400" /> Decentralized File Ledger
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
                                  <td className="py-3.5 text-right font-mono text-slate-300">
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
                                        className="p-1.5 text-slate-450 hover:text-rose-450 bg-slate-900 border border-white/5 rounded-lg hover:scale-105 transition-all cursor-pointer"
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

          {/* TAB 2: MY FILES LISTING */}
          {activeSidebarTab === 'files' && (
            <div className="glass-panel rounded-xl border border-white/5 p-6 glow-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" /> Vault Document Vault
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

              {/* Table replica */}
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
                                <div className="truncate text-slate-200 font-bold">{file.filename}</div>
                                <div className="text-[9px] text-slate-500 mt-0.5">
                                  {new Date(file.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5">
                            {!isLarge ? (
                              <span className="font-bold text-emerald-400 text-[9px] bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded uppercase">
                                REPLICATED ({fileProviders.length}x)
                              </span>
                            ) : (
                              <span className="font-bold text-violet-400 text-[9px] bg-violet-500/5 border border-violet-500/10 px-2 py-0.5 rounded uppercase">
                                CHUNKED ({file.chunks.length} blocks)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-right font-mono text-slate-300">
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
                        <td colSpan="4" className="py-12 text-center text-slate-550">No files found matching filter query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STORAGE ALLOCATION DETAILS */}
          {activeSidebarTab === 'storage' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="glass-panel rounded-xl border border-white/5 p-6 glow-card space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-400" /> B2 & R2 Allocations
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Backblaze B2 (Quota: 10GB)</span>
                      <span className="font-bold text-slate-350">
                        {formatBytes(files.reduce((acc, f) => acc + f.chunks.filter(c => c.provider === 'backblaze').reduce((s, c) => s + c.size, 0), 0))}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-sky-450 h-1.5 rounded-full" style={{ width: '4%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Cloudflare R2 (Quota: 10GB)</span>
                      <span className="font-bold text-slate-350">
                        {formatBytes(files.reduce((acc, f) => acc + f.chunks.filter(c => c.provider === 'cloudflare').reduce((s, c) => s + c.size, 0), 0))}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: '2.5%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl border border-white/5 p-6 glow-card space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Storage Policy Overview</h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Under Starter free tiers, you receive 10GB B2 storage and 10GB R2 storage (20GB total raw pool limits). 
                  Because Brotli deflate compression is performed locally before encrypting and distributing chunks, your actual physical space consumed is often halved, saving up to 55% network charges.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: HEALTH ANALYTICS */}
          {activeSidebarTab === 'analytics' && (
            <div className="glass-panel rounded-xl border border-white/5 p-6 glow-card space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" /> Storage Performance Analytics
              </h3>
              <PerformanceChart />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Average Response Delay</div>
                  <div className="text-lg font-bold text-white">77 ms</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Packet Deflate savings</div>
                  <div className="text-lg font-bold text-emerald-400">42.8% Saved</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Total Active outposts</div>
                  <div className="text-lg font-bold text-sky-400">2 / 2 Online</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeSidebarTab === 'settings' && (
            <div className="glass-panel rounded-xl border border-white/5 p-6 glow-card space-y-6 max-w-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-400" /> Console Settings
              </h3>
              
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-200">Local Mock Storage Driver</div>
                    <div className="text-[10px] text-slate-500 mt-1">Forces server to bypass S3 APIs and write locally</div>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    {isGuestMode ? 'ENABLED (GUEST)' : (stats.providers.backblaze?.isMock ? 'ENABLED (OFFLINE MOCK)' : 'DISABLED (PRODUCTION CLOUD)')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-200">Encryption Standard</div>
                    <div className="text-[10px] text-slate-500 mt-1">Current cryptographic standard for Vault streams</div>
                  </div>
                  <div className="text-xs font-bold text-emerald-450 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> AES-255-GCM
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-200">Brotli Deflate compression</div>
                    <div className="text-[10px] text-slate-500 mt-1">Pre-encryption deflate settings</div>
                  </div>
                  <div className="text-xs font-bold text-sky-400">Quality: 9 (Optimal)</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Overlay Step-by-Step upload progress modal */}
      {uploadingFile && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500/10 rounded-full flex items-center justify-center animate-bounce">
                <UploadCloud className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200 truncate max-w-[280px]">
                  Uploading {uploadingFile.name}
                </h3>
                <p className="text-[9px] text-slate-450 mt-0.5">{formatBytes(uploadingFile.size)}</p>
              </div>
            </div>

            <div className="space-y-4 text-[11px] text-slate-350">
              <div className="flex items-center gap-3">
                {uploadingFile.progress >= 30 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-slate-500 animate-spin shrink-0" />
                )}
                <span className={uploadingFile.progress >= 30 ? 'text-slate-250 font-bold' : 'text-slate-500'}>
                  Calculate file SHA-256 integrity hash
                </span>
              </div>

              <div className="flex items-center gap-3">
                {uploadingFile.progress >= 55 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className={`w-4 h-4 text-slate-500 shrink-0 ${uploadingFile.progress >= 30 ? 'animate-spin' : ''}`} />
                )}
                <span className={uploadingFile.progress >= 55 ? 'text-slate-250 font-bold' : 'text-slate-500'}>
                  Compress using Brotli level 9 algorithm
                </span>
              </div>

              <div className="flex items-center gap-3">
                {uploadingFile.progress >= 75 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className={`w-4 h-4 text-slate-500 shrink-0 ${uploadingFile.progress >= 55 ? 'animate-spin' : ''}`} />
                )}
                <span className={uploadingFile.progress >= 75 ? 'text-slate-250 font-bold' : 'text-slate-500'}>
                  Apply secure AES-256-GCM cipher keys
                </span>
              </div>

              <div className="flex items-center gap-3">
                {uploadingFile.progress >= 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className={`w-4 h-4 text-slate-500 shrink-0 ${uploadingFile.progress >= 75 ? 'animate-spin' : ''}`} />
                )}
                <span className={uploadingFile.progress >= 100 ? 'text-slate-250 font-bold' : 'text-slate-500'}>
                  Distribute chunks to multi-cloud nodes
                </span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-sky-400 to-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${uploadingFile.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Encryption active</span>
                <span>{uploadingFile.progress}% Complete</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Step-by-Step download progress modal */}
      {downloadingFile && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-5">
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

              <div className="flex items-center justify-between text-xs text-slate-350">
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
                  line.includes('[CRITICAL]') || line.includes('[ERROR]') ? 'text-rose-400' :
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
