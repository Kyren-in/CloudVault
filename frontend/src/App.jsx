import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, Lock, Shield, HardDrive, RefreshCw, FileText, Trash2, 
  Download, UploadCloud, LogOut, CheckCircle2, AlertTriangle, 
  Activity, Terminal, User, Server, Database, Key, Check, Info
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('cv_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('cv_user')) || null);
  const [isLogin, setIsLogin] = useState(true);
  
  // Auth Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Files & Stats State
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({
    storageUsed: { originalBytes: 0, cloudBytes: 0, savingsBytes: 0 },
    distribution: { awsChunks: 0, gcpChunks: 0 },
    providers: {
      aws: { name: 'AWS S3', type: 'aws', online: true, latency: 120, isMock: true },
      gcp: { name: 'Google Cloud Storage', type: 'gcp', online: true, latency: 90, isMock: true }
    }
  });
  
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null); // { name, size, step, progress }
  const [downloadingFile, setDownloadingFile] = useState(null); // { id, name, step, log: [] }
  const [actionError, setActionError] = useState('');
  const [logs, setLogs] = useState([]);
  
  const fileInputRef = useRef(null);

  // Auto-scroll logs
  const logsEndRef = useRef(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load files and stats when token is set
  useEffect(() => {
    if (token) {
      fetchDashboardData();
      addLog('CloudVault console initialized. Session active.');
    }
  }, [token]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleLogout = () => {
    localStorage.removeItem('cv_token');
    localStorage.removeItem('cv_user');
    setToken('');
    setUser(null);
    setFiles([]);
    setLogs([]);
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

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = isLogin ? 'login' : 'signup';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      localStorage.setItem('cv_token', data.token);
      localStorage.setItem('cv_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      // Clear forms
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleToggleProvider = async (providerKey) => {
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
        // Refresh other details
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
    
    // Simulate steps for visuals
    await sleep(600);
    setUploadingFile(prev => ({ ...prev, step: 'hash', progress: 30 }));
    const originalHash = 'calculating...';
    addLog(`Generating file digest integrity hash (SHA-256)...`);
    
    await sleep(600);
    setUploadingFile(prev => ({ ...prev, step: 'compress', progress: 50 }));
    addLog(`Running GZIP deflate compression...`);

    await sleep(600);
    setUploadingFile(prev => ({ ...prev, step: 'encrypt', progress: 70 }));
    addLog(`Generating custom AES-256 key. Encrypting payload...`);

    await sleep(500);
    setUploadingFile(prev => ({ ...prev, step: 'uploading', progress: 85 }));
    
    const isLarge = file.size >= (10 * 1024 * 1024); // 10MB Threshold
    if (isLarge) {
      addLog(`File size >= 10MB. Distributed chunking strategy active (split into 5MB blocks).`);
    } else {
      addLog(`File size < 10MB. Activating replication strategy (Upload full file to both clouds).`);
    }

    // Actual upload API call
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
        throw new Error(data.error || 'Upload request rejected by server.');
      }

      setUploadingFile(prev => ({ ...prev, step: 'done', progress: 100 }));
      
      const replicationInfo = isLarge 
        ? `Split into chunks and distributed round-robin.`
        : `Replicated completely across available cloud nodes.`;
      
      addLog(`File "${file.name}" uploaded successfully! ${replicationInfo}`, 'success');
      
      await sleep(800);
      setUploadingFile(null);
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message);
      addLog(`Upload failed: ${err.message}`, 'error');
      await sleep(3000);
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
    await sleep(500);

    addDlLog(`Reading chunk records (Total chunks: ${fileObj.chunks.length})...`);
    
    // Sort and evaluate providers
    const providersState = stats.providers;
    
    await sleep(600);
    setDownloadingFile(prev => ({ ...prev, step: 'pulling' }));
    
    // Simulate chunk download sequence logging
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
            await sleep(700);
            addDlLog(`Chunk #${chunk.chunkNumber} successfully retrieved from backup node.`);
          } else {
            addDlLog(`[CRITICAL] Backup replica on ${backupInfo.name} is also OFFLINE!`);
          }
        } else {
          addDlLog(`[CRITICAL] No backup replica exists for distributed chunk #${chunk.chunkNumber}!`);
        }
      } else {
        await sleep(500);
        addDlLog(`Chunk #${chunk.chunkNumber} retrieved (Latency: ${providerInfo.latency}ms)`);
      }
    }

    setDownloadingFile(prev => ({ ...prev, step: 'decrypting' }));
    addDlLog(`Merging payload streams...`);
    await sleep(400);
    addDlLog(`Initializing AES-256-GCM decipher. Verifying cryptographic GCM tag...`);
    await sleep(400);
    addDlLog(`Verifying whole file original SHA-256 checksum digest...`);
    await sleep(300);
    addDlLog(`Decompressing file using gunzip stream...`);
    await sleep(400);

    // Call API to fetch actual decrypted blob
    try {
      const res = await fetch(`${API_BASE}/download/${fileObj.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Server rejected decryption or retrieval.');
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
      addLog(`File download & decryption finished: ${fileObj.filename}`, 'success');
      
      await sleep(1000);
      setDownloadingFile(null);
    } catch (err) {
      setActionError(err.message);
      addLog(`Download failed: ${err.message}`, 'error');
      addDlLog(`[ERROR] Download operation terminated: ${err.message}`);
      await sleep(4000);
      setDownloadingFile(null);
    }
  };

  const handleDelete = async (fileId, filename) => {
    if (!confirm(`Are you sure you want to permanently delete "${filename}" across all cloud nodes?`)) return;
    
    setActionError('');
    addLog(`Initiating full deletion sequence for: ${filename}`);

    try {
      const res = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deletion request failed.');
      }

      addLog(`File "${filename}" successfully purged from all cloud providers.`, 'success');
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

  // Auth screen layout
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center relative px-4 overflow-hidden">
        {/* Glow Effects */}
        <div className="glow-spot-blue -top-20 -left-20"></div>
        <div className="glow-spot-purple -bottom-20 -right-20"></div>

        <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-800 p-8 shadow-2xl z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-sky-400 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/10 mb-4 animate-pulse-glow">
              <Cloud className="w-9 h-9 text-slate-900" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">CloudVault</h1>
            <p className="text-slate-400 text-sm mt-1 text-center">Multi-Cloud Distributed File Storage</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
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

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
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

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg p-3 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-sky-400 to-violet-500 hover:from-sky-500 hover:to-violet-600 active:scale-[0.98] text-slate-950 font-bold rounded-lg text-sm transition-all duration-150 shadow-lg shadow-sky-400/20 disabled:opacity-50"
            >
              {authLoading ? 'Authenticating...' : isLogin ? 'Sign In to Vault' : 'Create Vault Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError('');
              }}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate percentages
  const cloudUsed = stats.storageUsed.cloudBytes;
  // Free tier total: AWS (5GB) + GCP (5GB) = 10GB
  const totalFreeTier = 10 * 1024 * 1024 * 1024;
  const usedPercent = Math.min(100, (cloudUsed / totalFreeTier) * 100);

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Header */}
      <header className="glass-panel border-b border-slate-800/80 sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-sky-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/5">
            <Cloud className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              CloudVault <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-semibold">BETA</span>
            </h1>
            <p className="text-[10px] text-slate-400">Multi-Cloud Storage & Failover Control</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-200">{user?.name}</span>
            <span className="text-[10px] text-slate-400">{user?.email}</span>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden md:block"></div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Stats and Health */}
        <div className="lg:col-span-1 space-y-6">
          {/* Storage Capacity Gauge */}
          <div className="glass-panel rounded-xl border border-slate-850 p-6 glow-card">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-sky-400" /> Vault Storage Capacity
            </h2>
            
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Visual Radial Ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke="url(#progress-gradient)" 
                    strokeWidth="8" 
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * usedPercent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-2xl font-extrabold text-white">{usedPercent.toFixed(2)}%</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Used</span>
                </div>
              </div>

              <div className="mt-5 w-full space-y-3">
                <div className="flex justify-between text-xs border-b border-slate-800/50 pb-2">
                  <span className="text-slate-400">Total Upload Size</span>
                  <span className="font-semibold text-white">{formatBytes(stats.storageUsed.originalBytes)}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-slate-800/50 pb-2">
                  <span className="text-slate-400">Actual Cloud Size</span>
                  <span className="font-semibold text-sky-400">{formatBytes(stats.storageUsed.cloudBytes)}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-slate-800/50 pb-2">
                  <span className="text-slate-400">Compression Deflate</span>
                  <span className="font-semibold text-emerald-400">
                    {getCompressionRatio(stats.storageUsed.originalBytes, stats.storageUsed.cloudBytes)} ({formatBytes(stats.storageUsed.savingsBytes)} Saved)
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Multi-Cloud Quota Limit</span>
                  <span className="font-medium text-slate-400">10.0 GB (Free Tiers)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Outage Health Simulator */}
          <div className="glass-panel rounded-xl border border-slate-850 p-6 glow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-violet-400" /> Failover Outage Simulator
              </h2>
              <Activity className="w-4 h-4 text-emerald-400 pulse-glow" />
            </div>

            <p className="text-slate-400 text-xs mb-5">
              Toggle providers to simulate cloud downtime. Triggering downloads will dynamically route around offline hosts.
            </p>

            <div className="space-y-4">
              {Object.entries(stats.providers).map(([key, provider]) => (
                <div key={key} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full ${provider.online ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 shadow-lg shadow-rose-500/20'}`}></div>
                      <div>
                        <div className="text-xs font-bold text-white">{provider.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {provider.isMock ? 'Simulated Driver' : 'Real Integration'}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleToggleProvider(key)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border transition-all ${
                        provider.online 
                          ? 'bg-rose-950/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
                          : 'bg-emerald-950/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                      }`}
                    >
                      {provider.online ? 'Kill Node' : 'Revive'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-850">
                    <span className="text-slate-400">Response Delay:</span>
                    <span className="font-semibold text-slate-300">
                      {provider.online ? `${provider.latency} ms` : '∞ (Timeout)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Replica Chunks:</span>
                    <span className="font-bold text-sky-400">
                      {key === 'aws' ? stats.distribution.awsChunks : stats.distribution.gcpChunks} chunks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: File Upload, Listing */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* File Vault Manager */}
          <div className="glass-panel rounded-xl border border-slate-850 p-6 flex-1 flex flex-col glow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" /> Decentralized Vault
              </h2>
              
              <button 
                onClick={fetchDashboardData}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 rounded-lg hover:scale-105 transition-all"
                title="Refresh Vault"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Drag & Drop Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-950/20 hover:bg-sky-500/5 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 mb-6 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Upload new asset to Vault</h3>
              <p className="text-xs text-slate-400 mt-1">Drag and drop, or click to browse files</p>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">
                Files &lt; 10MB are fully replicated (100% redundant). Files &ge; 10MB are chunked and distributed.
              </p>
            </div>

            {actionError && (
              <div className="mb-4 flex items-center gap-2 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg p-3 text-xs">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Files List */}
            <div className="flex-1 overflow-x-auto min-h-[300px]">
              {filesLoading ? (
                <div className="space-y-3 py-10">
                  <div className="h-10 w-full shimmer-bg rounded-lg"></div>
                  <div className="h-10 w-full shimmer-bg rounded-lg"></div>
                  <div className="h-10 w-full shimmer-bg rounded-lg"></div>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs">
                  <Database className="w-8 h-8 text-slate-700 mb-2" />
                  <span>No assets securely loaded. Try uploading a file above.</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="pb-3 pl-2">Asset Details</th>
                      <th className="pb-3">Layout Strategy</th>
                      <th className="pb-3 text-right">Raw Size</th>
                      <th className="pb-3 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {files.map(file => {
                      const isLarge = file.size >= (10 * 1024 * 1024);
                      const awsCount = file.chunks.filter(c => c.provider === 'aws').length;
                      const gcpCount = file.chunks.filter(c => c.provider === 'gcp').length;
                      
                      return (
                        <tr key={file.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 pl-2 max-w-[200px] truncate font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                              <div className="truncate">
                                <div className="truncate text-slate-200 font-semibold" title={file.filename}>
                                  {file.filename}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                  <span className="flex items-center text-emerald-400 gap-0.5">
                                    <Shield className="w-3 h-3" /> Encrypted GCM
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5">
                            {!isLarge ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-emerald-400 text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-max">
                                  REPLICATED 2X
                                </span>
                                <div className="flex gap-1.5 items-center mt-1 pl-1">
                                  <span className="text-[9px] text-sky-400 border border-sky-400/20 px-1 rounded">AWS</span>
                                  <span className="text-[9px] text-violet-400 border border-violet-400/20 px-1 rounded">GCP</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-violet-400 text-[10px] bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full w-max">
                                  DISTRIBUTED CHUNKS
                                </span>
                                <div className="flex gap-1.5 items-center mt-1 text-[9px] text-slate-400 pl-1">
                                  <span>{file.chunks.length} blocks ({awsCount}x AWS, {gcpCount}x GCP)</span>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 text-right font-medium text-slate-300">
                            {formatBytes(file.size)}
                          </td>

                          <td className="py-3.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => handleDownload(file)}
                                className="p-1.5 text-slate-400 hover:text-sky-400 bg-slate-900 border border-slate-800 rounded-lg hover:scale-105 transition-all"
                                title="Download and Decrypt"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(file.id, file.filename)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg hover:scale-105 transition-all"
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
      </main>

      {/* Terminal Log Console */}
      <footer className="w-full max-w-7xl mx-auto p-4 md:p-6 pt-0 z-30">
        <div className="glass-panel rounded-xl border border-slate-850 p-4">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-3">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Multi-Cloud Operations Feed</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-900 rounded-lg p-3 font-mono text-[11px] h-32 overflow-y-auto custom-scrollbar space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-500 font-bold shrink-0">[{log.timestamp}]</span>
                <span className={
                  log.type === 'error' ? 'text-rose-400 font-semibold' :
                  log.type === 'warn' ? 'text-amber-400' :
                  log.type === 'success' ? 'text-emerald-400' :
                  'text-slate-300'
                }>
                  {log.message}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-slate-600 italic">No cloud activities logged. Try uploading or toggling node state.</div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </footer>

      {/* Overlay Step-by-Step upload progress modal */}
      {uploadingFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-xl border border-slate-850 p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500/10 rounded-full flex items-center justify-center animate-bounce">
                <UploadCloud className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200 truncate max-w-[280px]">
                  Uploading {uploadingFile.name}
                </h3>
                <p className="text-[10px] text-slate-400">{formatBytes(uploadingFile.size)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs">
                {uploadingFile.progress >= 30 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-slate-500 animate-spin shrink-0" />
                )}
                <span className={uploadingFile.progress >= 30 ? 'text-slate-300 font-medium' : 'text-slate-400'}>
                  Calculate file SHA-256 integrity hash
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {uploadingFile.progress >= 50 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className={`w-4 h-4 text-slate-500 shrink-0 ${uploadingFile.progress >= 30 ? 'animate-spin' : ''}`} />
                )}
                <span className={uploadingFile.progress >= 50 ? 'text-slate-300 font-medium' : 'text-slate-400'}>
                  Compress using GZIP deflate algorithm
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {uploadingFile.progress >= 70 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className={`w-4 h-4 text-slate-500 shrink-0 ${uploadingFile.progress >= 50 ? 'animate-spin' : ''}`} />
                )}
                <span className={uploadingFile.progress >= 70 ? 'text-slate-300 font-medium' : 'text-slate-400'}>
                  Apply secure AES-256-GCM cipher
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {uploadingFile.progress >= 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className={`w-4 h-4 text-slate-500 shrink-0 ${uploadingFile.progress >= 70 ? 'animate-spin' : ''}`} />
                )}
                <span className={uploadingFile.progress >= 100 ? 'text-slate-300 font-medium' : 'text-slate-400'}>
                  Replicate or chunk to multi-cloud nodes
                </span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-sky-400 to-violet-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${uploadingFile.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Encryption active</span>
                <span>{uploadingFile.progress}% Complete</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Step-by-Step download progress modal */}
      {downloadingFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-xl border border-slate-850 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-850 pb-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-full flex items-center justify-center animate-bounce">
                <Download className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200 truncate max-w-[280px]">
                  Downloading {downloadingFile.name}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Multi-Cloud Re-assembly</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" /> Pulling Cloud Assets
                </span>
                {downloadingFile.step === 'metadata' || downloadingFile.step === 'pulling' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" /> Cryptographic Decryption
                </span>
                {downloadingFile.step === 'decrypting' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                ) : downloadingFile.step === 'done' ? (
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                ) : (
                  <span className="text-[10px] text-slate-600">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" /> Integrity Verification
                </span>
                {downloadingFile.step === 'done' ? (
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                ) : (
                  <span className="text-[10px] text-slate-600">Pending</span>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 font-mono text-[10px] h-28 overflow-y-auto custom-scrollbar text-slate-400 space-y-1">
              {downloadingFile.log.map((line, idx) => (
                <div key={idx} className={
                  line.includes('[FAILOVER]') ? 'text-amber-400' :
                  line.includes('[CRITICAL]') || line.includes('[ERROR]') ? 'text-rose-400' :
                  'text-slate-400'
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
