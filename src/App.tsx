import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Film, 
  Plus, 
  Search, 
  LogOut, 
  User, 
  Star, 
  Trash2, 
  Edit, 
  X, 
  Globe, 
  Calendar, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  Sparkles, 
  Filter, 
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  LayoutDashboard,
  List,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces mapping back to database schema
interface WatchlistItem {
  id: number;
  user_id: number;
  judul: string;
  kategori: string;
  genre: string;
  tahun_rilis: number | null;
  negara: string;
  status: string;
  review: string;
  rating: number | null;
  poster_path: string;
  created_at?: string;
  updated_at?: string;
}

const normalizeCategoryName = (kategori: string): string => {
  if (!kategori) return '';
  const val = kategori.trim().toLowerCase();
  if (val.includes('anime jp') || val === 'anime' || val.includes('anime')) {
    return 'Anime';
  }
  if (val.includes('drama korea kr') || val === 'drama korea' || val.includes('drama korea') || val.includes('drakor')) {
    return 'Drama Korea';
  }
  if (val === 'movie' || val === 'movies') {
    return 'Movie';
  }
  if (val === 'series' || val === 'tv series') {
    return 'Series';
  }
  if (val === 'variety show' || val === 'variety') {
    return 'Variety Show';
  }
  
  // Title Case fallback
  return kategori
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const normalizeCountryName = (negara: string): string => {
  if (!negara) return '';
  const val = negara.trim().toLowerCase();
  if (val === 'jp' || val === 'jepang' || val === 'japan') {
    return 'Jepang';
  }
  if (val === 'kr' || val === 'korea' || val === 'south korea' || val === 'korsel' || val === 'korea selatan') {
    return 'Korea Selatan';
  }
  if (val === 'usa' || val === 'us' || val === 'united states' || val === 'america' || val === 'amerika') {
    return 'USA';
  }
  if (val === 'id' || val === 'indonesia' || val === 'indo') {
    return 'Indonesia';
  }
  if (val === 'uk' || val === 'united kingdom' || val === 'inggris') {
    return 'Inggris';
  }
  
  // Title Case fallback
  return negara
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface UserSession {
  id: number;
  username: string;
  email: string;
}

export default function App() {
  // Authentication & Session state
  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Navigation / Sidebar tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mylist' | 'profile'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Auth Form input state
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [dbStats, setDbStats] = useState<{ completed: number; toWatch: number; watching: number; total: number } | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [genreFilter, setGenreFilter] = useState<string>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  
  // Sidebar visibility & Deployment guide modal
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
  
  // Add/Edit Form State
  const [formJudul, setFormJudul] = useState('');
  const [formKategori, setFormKategori] = useState('Movie');
  const [formGenre, setFormGenre] = useState('');
  const [formTahun, setFormTahun] = useState('');
  const [formNegara, setFormNegara] = useState('');
  const [formStatus, setFormStatus] = useState('To Watch');
  const [formReview, setFormReview] = useState('');
  const [formRating, setFormRating] = useState('5');
  const [formPosterUrl, setFormPosterUrl] = useState('');
  const [formPosterFile, setFormPosterFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Feedback Messages
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show visual notifications (toast)
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch current session on load
  useEffect(() => {
    fetchSession();
  }, []);

  // Sync URL parameters on mount/popstate
  useEffect(() => {
    const handleUrlSync = () => {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;
      const statusParam = params.get('status');

      if (path === '/mylist' || statusParam) {
        setActiveTab('mylist');
        if (statusParam) {
          const lower = statusParam.toLowerCase();
          if (lower === 'finished' || lower === 'completed') {
            setStatusFilter('Completed');
          } else if (lower === 'towatch' || lower === 'to-watch') {
            setStatusFilter('To Watch');
          } else if (lower === 'watching') {
            setStatusFilter('Watching');
          }
        }
      }
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 2. Fetch Watchlist items
  useEffect(() => {
    if (user) {
      fetchWatchlist();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/watchlist/stats');
      if (res.ok) {
        const data = await res.json();
        setDbStats(data.stats);
      }
    } catch (err) {
      console.error('Fetch stats failed:', err);
    }
  };

  const fetchWatchlist = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        const cleanedList = (data.watchlist || []).map((item: any) => ({
          ...item,
          kategori: normalizeCategoryName(item.kategori),
          negara: normalizeCountryName(item.negara)
        }));
        setWatchlist(cleanedList);
      } else {
        const errData = await res.json();
        showNotification(errData.error || 'Gagal mengambil data tontonan', 'error');
      }
      fetchStats();
    } catch (err) {
      console.error('Fetch watchlist failed:', err);
      showNotification('Terjadi kesalahan koneksi server', 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  // 3. Auth Actions
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usernameInput || !passwordInput) {
      showNotification('Semua kolom input wajib diisi!', 'error');
      return;
    }

    try {
      const url = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' 
        ? { username: usernameInput, password: passwordInput }
        : { 
            username: usernameInput, 
            email: `${usernameInput.trim().toLowerCase()}@plottea.com`, 
            password: passwordInput 
          };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (res.ok) {
        showNotification(data.message || 'Berhasil masuk!');
        setUser(data.user);
        // Reset forms
        setUsernameInput('');
        setEmailInput('');
        setPasswordInput('');
      } else {
        showNotification(data.error || 'Gagal autentikasi', 'error');
      }
    } catch (err) {
      console.error('Auth request failed:', err);
      showNotification('Gagal menghubungi server', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        setWatchlist([]);
        showNotification('Anda berhasil keluar dari PlotTea.');
      }
    } catch (err) {
      console.error('Logout failed:', err);
      showNotification('Gagal keluar sesi', 'error');
    }
  };

  // 4. Form Actions (Create & Update)
  const openAddForm = () => {
    setEditingItem(null);
    setFormJudul('');
    setFormKategori('Movie');
    setFormGenre('');
    setFormTahun('');
    setFormNegara('');
    setFormStatus('To Watch');
    setFormReview('');
    setFormRating('5');
    setFormPosterUrl('');
    setFormPosterFile(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item: WatchlistItem) => {
    setEditingItem(item);
    setFormJudul(item.judul);
    setFormKategori(item.kategori);
    setFormGenre(item.genre || '');
    setFormTahun(item.tahun_rilis ? String(item.tahun_rilis) : '');
    setFormNegara(item.negara || '');
    setFormStatus(item.status);
    setFormReview(item.review || '');
    setFormRating(item.rating ? String(item.rating) : '5');
    
    if (item.poster_path && !item.poster_path.startsWith('/uploads/')) {
      setFormPosterUrl(item.poster_path);
    } else {
      setFormPosterUrl('');
    }
    setFormPosterFile(null);
    setIsFormOpen(true);
  };

  // Drag and drop poster handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setFormPosterFile(file);
        setFormPosterUrl('');
      } else {
        showNotification('File harus berformat gambar!', 'error');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormPosterFile(e.target.files[0]);
      setFormPosterUrl('');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedKategori = normalizeCategoryName(formKategori);
    const normalizedNegara = normalizeCountryName(formNegara);

    // Rule 2: Saat user nambah data, input judul, kategori, genre, tahun rilis, dan negara wajib diisi
    if (!formJudul || !normalizedKategori || !formGenre || !formTahun || !normalizedNegara) {
      showNotification('Judul, Kategori, Genre, Tahun Rilis, dan Negara wajib diisi!', 'error');
      return;
    }

    // Rule 3: Rating wajib diisi angka 1-10 jika statusnya 'finished' (Completed / Selesai)
    const normalizedStatus = (formStatus || '').toLowerCase();
    if (normalizedStatus === 'completed' || normalizedStatus === 'finished') {
      const parsedRating = parseInt(formRating, 10);
      if (!formRating || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
        showNotification('Rating wajib diisi angka antara 1 sampai 10 jika statusnya Selesai (Completed/Finished)!', 'error');
        return;
      }
    }

    // Prepare Multipart FormData
    const formData = new FormData();
    formData.append('judul', formJudul);
    formData.append('kategori', normalizedKategori);
    formData.append('genre', formGenre);
    formData.append('tahun_rilis', formTahun);
    formData.append('negara', normalizedNegara);
    formData.append('status', formStatus);
    formData.append('review', formReview);
    formData.append('rating', formRating);
    
    if (formPosterFile) {
      formData.append('poster', formPosterFile);
    }

    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `/api/watchlist/${editingItem.id}` : '/api/watchlist';

      const res = await fetch(url, {
        method,
        body: formData // Note: no Content-Type header so fetch browser boundary sets it correctly with multer boundary
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Data tontonan berhasil disimpan!');
        setIsFormOpen(false);
        window.location.reload();
      } else {
        showNotification(data.error || 'Gagal menyimpan data tontonan', 'error');
      }
    } catch (err) {
      console.error('Save watchlist failed:', err);
      showNotification('Gagal menghubungi server saat menyimpan data', 'error');
    }
  };

  // 5. Delete Action
  const handleDeleteItem = async (id: number, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${title}" dari daftar tontonan PlotTea?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showNotification(data.message || 'Tontonan berhasil dihapus.');
        fetchWatchlist();
      } else {
        showNotification(data.error || 'Gagal menghapus data', 'error');
      }
    } catch (err) {
      console.error('Delete item failed:', err);
      showNotification('Terjadi kesalahan server', 'error');
    }
  };

  const toggleReview = (id: number) => {
    setExpandedReviews(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute metrics/stats
  const totalWatch = dbStats ? dbStats.total : watchlist.length;
  const completedCount = dbStats ? dbStats.completed : watchlist.filter(item => item.status === 'Completed').length;
  const watchingCount = dbStats ? dbStats.watching : watchlist.filter(item => item.status === 'Watching').length;
  const toWatchCount = dbStats ? dbStats.toWatch : watchlist.filter(item => item.status === 'To Watch').length;
  const averageRating = watchlist.filter(item => item.rating).length > 0 
    ? (watchlist.reduce((sum, item) => sum + (item.rating || 0), 0) / watchlist.filter(item => item.rating).length).toFixed(1)
    : 'N/A';

  // Get unique genres dynamically from existing watchlist
  const uniqueGenres = React.useMemo(() => {
    const genresSet = new Set<string>();
    watchlist.forEach(item => {
      if (item.genre) {
        item.genre.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) genresSet.add(trimmed);
        });
      }
    });
    return Array.from(genresSet).sort();
  }, [watchlist]);

  // Get unique countries dynamically from existing watchlist
  const uniqueCountries = React.useMemo(() => {
    const countrySet = new Set<string>();
    watchlist.forEach(item => {
      if (item.negara) {
        const trimmed = item.negara.trim();
        if (trimmed) countrySet.add(trimmed);
      }
    });
    return Array.from(countrySet).sort();
  }, [watchlist]);

  // Client-side filtering for My List
  const filteredWatchlist = watchlist.filter(item => {
    const matchesSearch = !searchTerm || 
      item.judul.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.genre && item.genre.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (item.negara && item.negara.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.review && item.review.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'All' || categoryFilter === 'Semua' || categoryFilter === '' || item.kategori === categoryFilter;
    const matchesStatus = statusFilter === 'All' || statusFilter === 'Semua' || statusFilter === '' || item.status === statusFilter;
    
    // Check if the item's genre string has a match (splitting by comma to handle multiple genres)
    const matchesGenre = genreFilter === 'All' || genreFilter === 'Semua' || genreFilter === '' || (item.genre && item.genre.toLowerCase().split(',').map(g => g.trim()).includes(genreFilter.toLowerCase()));
    // Check if the item's country has a match
    const matchesCountry = countryFilter === 'All' || countryFilter === 'Semua' || countryFilter === '' || (item.negara && item.negara.trim().toLowerCase() === countryFilter.toLowerCase());
    
    return matchesSearch && matchesCategory && matchesStatus && matchesGenre && matchesCountry;
  });

  // Extract Currently Watching items for Dashboard scroll section
  const currentlyWatchingItems = watchlist.filter(item => item.status === 'Watching');

  // Sleek Dark Mode status label stylings
  const getStatusBadgeStyle = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Watching': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'To Watch': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'On Hold': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'Dropped': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Completed': return 'Selesai Ditonton';
      case 'Watching': return 'Sedang Ditonton';
      case 'To Watch': return 'Rencana Tonton';
      case 'On Hold': return 'Tertunda';
      case 'Dropped': return 'Batal Ditonton';
      default: return status;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans-jakarta">
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
            id="spinner"
          />
          <h2 className="text-xl font-sans-jakarta font-semibold text-slate-200">Meracik PlotTea...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans-jakarta antialiased selection:bg-blue-600/30 selection:text-white">
      {/* Toast notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm max-w-md w-11/12 ${
              notification.type === 'success' 
                ? 'bg-slate-800 border-emerald-500/30 text-emerald-300' 
                : 'bg-slate-800 border-rose-500/30 text-rose-300'
            }`}
            id="toast-notification"
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= AUTHENTICATION VIEW ================= */}
      {!user ? (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700 relative overflow-hidden shadow-2xl"
            id="auth-card"
          >
            {/* App Logo */}
            <div className="flex flex-col items-center text-center space-y-2 mb-8 relative z-10">
              <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg border border-slate-700">
                <Film className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-sans-jakarta font-black tracking-wider text-white uppercase">Plot<span className="text-blue-500">Tea</span></h1>
            </div>

            {/* Auth Tab Selectors */}
            <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1 mb-6 relative z-10" id="auth-tabs">
              <button
                type="button"
                className={`flex-1 py-2.5 text-xs font-sans-jakarta font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'login' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setAuthMode('login')}
                id="btn-tab-login"
              >
                Masuk Sesi
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-xs font-sans-jakarta font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'register' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setAuthMode('register')}
                id="btn-tab-register"
              >
                Daftar Akun
              </button>
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4 relative z-10" id="auth-form">
              <div>
                <label className="block text-xs font-sans-jakarta font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-100 transition-all placeholder-slate-500"
                  id="input-auth-username"
                />
              </div>

              <div>
                <label className="block text-xs font-sans-jakarta font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Masukkan password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-100 transition-all placeholder-slate-500"
                    id="input-auth-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 focus:outline-none transition-colors cursor-pointer"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    id="btn-toggle-password-visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl text-sm font-sans-jakarta font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                id="btn-auth-submit"
              >
                {authMode === 'login' ? 'Masuk ke PlotTea' : 'Buat Akun Baru'}
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        /* ================= MAIN CONTAINER WITH LEFT SIDEBAR ================= */
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-900 text-slate-200 font-sans-jakarta" id="app-main-layout">
          {/* Mobile Header bar */}
          <div className="md:hidden flex items-center justify-between p-4 bg-slate-800 text-white border-b border-slate-700" id="mobile-header">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm border border-slate-700">
                <Film className="w-5 h-5" />
              </div>
              <span className="font-sans-jakarta font-black text-xl tracking-wider uppercase">Plot<span className="text-blue-500">Tea</span></span>
            </div>
            
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-700 transition-all text-slate-200 cursor-pointer"
              id="btn-mobile-sidebar-toggle"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Left Sidebar */}
          <aside 
            className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-800 border-r border-slate-700 p-5 flex flex-col justify-between transform transition-all duration-300 ease-in-out md:translate-x-0 shrink-0 ${
              isSidebarVisible ? 'md:flex md:h-screen md:sticky md:top-0' : 'md:hidden'
            } ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            id="app-sidebar"
          >
            <div className="space-y-6">
              {/* Logo block */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg border border-slate-700 shrink-0">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-sans-jakarta font-black tracking-wider text-white uppercase">Plot<span className="text-blue-500">Tea</span></h1>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Watchlist Engine</p>
                  </div>
                </div>
                {/* Close button for mobile slide-over */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex md:hidden p-1.5 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
                  title="Tutup Menu"
                  id="btn-sidebar-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Menus */}
              <nav className="space-y-1" id="sidebar-nav">
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                  id="tab-dashboard"
                >
                  <LayoutDashboard className="w-4.5 h-4.5" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('mylist');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    activeTab === 'mylist'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                  id="tab-mylist"
                >
                  <List className="w-4.5 h-4.5" />
                  <span>My List</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                  id="tab-profile"
                >
                  <User className="w-4.5 h-4.5" />
                  <span>Profile</span>
                </button>
              </nav>
            </div>

            {/* Sidebar User Footer */}
            <div className="pt-4 border-t border-slate-700 space-y-3">
              <div className="flex items-center space-x-3 px-1">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.username}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email || `${user.username.toLowerCase()}@plottea.com`}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold text-rose-400 transition-all border border-rose-500/20 cursor-pointer"
                id="btn-sidebar-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Sesi</span>
              </button>
            </div>
          </aside>

          {/* Sidebar Backdrop Overlay on Mobile */}
          {isSidebarOpen && (
            <div 
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              id="sidebar-backdrop"
            />
          )}

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col w-full overflow-y-auto" id="main-content-pane">
            {/* Desktop Sidebar Toggle (Ikon saja, tanpa teks) */}
            <div className="hidden md:flex items-center mb-6 shrink-0">
              <button
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer shadow-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-600"
                id="btn-desktop-sidebar-toggle"
                title={isSidebarVisible ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
            {/* Dashboard active view */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fade-in" id="view-dashboard">
                {/* Welcome block */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
                  <div>
                    <h2 className="text-2xl font-sans-jakarta font-bold text-white">Selamat datang, {user.username}!</h2>
                    <p className="text-sm font-sans-jakarta font-normal text-slate-400 mt-1">Kelola dan ulas koleksi tontonanmu di PlotTea dengan suasana menyenangkan.</p>
                  </div>
                  <button
                    onClick={openAddForm}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-xs font-sans-jakarta font-semibold shadow-md transition-all cursor-pointer flex items-center space-x-1.5 border border-blue-500/30"
                    id="btn-dashboard-add"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Catat Tontonan</span>
                  </button>
                </div>

                {/* 3 Statistical Boxes */}
                <div className="space-y-2">
                  <h3 className="text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400">Statistik Menonton</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="dashboard-stats-grid">
                    {/* Stat 1: Total Ditonton */}
                    <a
                      href="/mylist?status=finished"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('mylist');
                        setStatusFilter('Completed');
                        window.history.pushState({}, '', '/mylist?status=finished');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200 cursor-pointer p-5 rounded-lg border border-slate-700 shadow-sm relative overflow-hidden block group"
                    >
                      <div className="flex flex-col justify-between h-full">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold group-hover:text-blue-400 transition-colors">Total Ditonton</span>
                        <div className="flex items-baseline space-x-2 mt-2">
                          <span className="text-4xl font-sans-jakarta font-extrabold text-white group-hover:scale-105 transition-transform duration-200 inline-block">{completedCount}</span>
                          <span className="text-xs text-slate-400 font-medium">selesai</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">Daftar tontonan yang telah diselesaikan.</p>
                      </div>
                    </a>

                    {/* Stat 2: Total Plan to Watch */}
                    <a
                      href="/mylist?status=towatch"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('mylist');
                        setStatusFilter('To Watch');
                        window.history.pushState({}, '', '/mylist?status=towatch');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200 cursor-pointer p-5 rounded-lg border border-slate-700 shadow-sm relative overflow-hidden block group"
                    >
                      <div className="flex flex-col justify-between h-full">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold group-hover:text-blue-400 transition-colors">Plan to Watch</span>
                        <div className="flex items-baseline space-x-2 mt-2">
                          <span className="text-4xl font-sans-jakarta font-extrabold text-white group-hover:scale-105 transition-transform duration-200 inline-block">{toWatchCount}</span>
                          <span className="text-xs text-slate-400 font-medium">rencana</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">Daftar judul rencana tonton menarik.</p>
                      </div>
                    </a>

                    {/* Stat 3: Sedang Ditonton */}
                    <a
                      href="/mylist?status=watching"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('mylist');
                        setStatusFilter('Watching');
                        window.history.pushState({}, '', '/mylist?status=watching');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200 cursor-pointer p-5 rounded-lg border border-slate-700 shadow-sm relative overflow-hidden block group"
                    >
                      <div className="flex flex-col justify-between h-full">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold group-hover:text-blue-400 transition-colors">Sedang Ditonton</span>
                        <div className="flex items-baseline space-x-2 mt-2">
                          <span className="text-4xl font-sans-jakarta font-extrabold text-white group-hover:scale-105 transition-transform duration-200 inline-block">{watchingCount}</span>
                          <span className="text-xs text-slate-400 font-medium">judul aktif</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">Film atau serial yang saat ini sedang diikuti.</p>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Currently Watching with Horizontal Scroll */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-sans-jakarta font-bold text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span>Currently Watching / Sedang Ditonton</span>
                    </h3>
                    <span className="text-xs font-sans-jakarta font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded border border-slate-700">
                      {currentlyWatchingItems.length} Judul
                    </span>
                  </div>

                  {currentlyWatchingItems.length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center" id="empty-watching">
                      <p className="text-sm text-slate-400 italic">Tidak ada tontonan yang sedang berlangsung saat ini.</p>
                      <button
                        onClick={() => setActiveTab('mylist')}
                        className="mt-3 inline-flex items-center space-x-1 px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-sans-jakarta font-semibold rounded transition-all cursor-pointer"
                      >
                        <span>Kelola Daftar Saya</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex overflow-x-auto gap-4 pb-2 pt-1 snap-x scroll-smooth custom-scrollbar" id="currently-watching-scroll">
                      {currentlyWatchingItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="w-44 shrink-0 bg-slate-800 border border-slate-700 rounded-lg p-2 snap-start hover:border-slate-500 transition-all flex flex-col justify-between shadow-md"
                        >
                          <div>
                            {/* Poster preview */}
                            <div className="relative aspect-[3/4] rounded-md overflow-hidden bg-slate-900 border border-slate-700 mb-2">
                              {item.poster_path ? (
                                <img
                                  src={item.poster_path}
                                  alt={item.judul}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLElement).parentElement;
                                    if (parent) {
                                      const placeholder = parent.querySelector('.scroll-placeholder');
                                      if (placeholder) placeholder.classList.remove('hidden');
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={`scroll-placeholder absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-950/80 via-indigo-900/60 to-slate-900 border border-slate-700/50 p-3 text-center ${item.poster_path ? 'hidden' : ''}`}>
                                <div className="p-1 bg-blue-600/20 rounded-lg mb-1.5 border border-blue-500/30">
                                  {item.kategori === 'Movie' ? <Film className="w-5 h-5 text-blue-400" /> : <Tv className="w-5 h-5 text-blue-400" />}
                                </div>
                                <span className="text-[11px] font-sans-jakarta font-bold text-slate-200 line-clamp-3 text-center leading-tight mb-1">
                                  {item.judul}
                                </span>
                                <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-blue-400/80">{item.kategori}</span>
                              </div>
                            </div>

                            <h4 className="font-sans-jakarta font-semibold text-xs text-slate-200 line-clamp-1" title={item.judul}>
                              {item.judul}
                            </h4>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] font-sans-jakarta font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                {item.kategori}
                              </span>
                              {item.tahun_rilis && (
                                <span className="text-[9px] font-sans-jakarta font-semibold text-slate-400 font-mono">
                                  {item.tahun_rilis}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-700/80 flex justify-end">
                            <button
                              onClick={() => openEditForm(item)}
                              className="w-full text-center py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-sans-jakarta font-semibold rounded transition-all cursor-pointer"
                              id={`btn-quick-edit-${item.id}`}
                            >
                              Edit Detail
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* My List active view */}
            {activeTab === 'mylist' && (
              <div className="space-y-6 animate-fade-in" id="view-mylist">
                {/* Header with Title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-sans-jakarta font-bold text-white">Daftar Tontonan Saya</h2>
                    <p className="text-xs font-sans-jakarta font-normal text-slate-400">Seduh teh hangatmu, tonton film menarik, dan catat pengalamanmu di sini.</p>
                  </div>

                  <button
                    onClick={openAddForm}
                    className="sm:self-center bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg text-xs font-sans-jakarta font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer border border-blue-500/30"
                    id="btn-add-watchlist"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Watchlist</span>
                  </button>
                </div>

                {/* Control Panel Filter block */}
                <section className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md animate-fade-in" id="control-panel">
                  <div className="flex flex-col gap-2 md:gap-4">
                    
                    {/* Search bar */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cari judul film, genre, ulasan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-14 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-200 transition-all placeholder-slate-500"
                        id="search-input"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-300 text-xs font-sans-jakarta font-semibold cursor-pointer"
                          id="clear-search"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    {/* 4 Dropdown Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
                      
                      {/* Category Dropdown */}
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-blue-500">
                          <Tag className="w-3.5 h-3.5" />
                        </span>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="w-full pl-8.5 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-sans-jakarta font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
                          id="category-select"
                        >
                          <option value="All">Semua Kategori</option>
                          <option value="Movie">Movie</option>
                          <option value="Drama Korea">Drama Korea</option>
                          <option value="Anime">Anime</option>
                          <option value="Variety Show">Variety Show</option>
                          <option value="Series">Series</option>
                        </select>
                        <div className="absolute right-3 pointer-events-none text-slate-400">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Genre Dropdown */}
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-blue-500">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <select
                          value={genreFilter}
                          onChange={(e) => setGenreFilter(e.target.value)}
                          className="w-full pl-8.5 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-sans-jakarta font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
                          id="genre-select"
                        >
                          <option value="All">Semua Genre</option>
                          {uniqueGenres.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 pointer-events-none text-slate-400">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Country Dropdown */}
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-blue-500">
                          <Globe className="w-3.5 h-3.5" />
                        </span>
                        <select
                          value={countryFilter}
                          onChange={(e) => setCountryFilter(e.target.value)}
                          className="w-full pl-8.5 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-sans-jakarta font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
                          id="country-select"
                        >
                          <option value="All">Semua Negara Asal</option>
                          {uniqueCountries.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 pointer-events-none text-slate-400">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-blue-500">
                          <Filter className="w-3.5 h-3.5" />
                        </span>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full pl-8.5 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-sans-jakarta font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
                          id="status-select"
                        >
                          <option value="All">Semua Status</option>
                          <option value="To Watch">Rencana Tonton</option>
                          <option value="Watching">Sedang Ditonton</option>
                          <option value="Completed">Selesai</option>
                          <option value="On Hold">Tertunda</option>
                          <option value="Dropped">Batal</option>
                        </select>
                        <div className="absolute right-3 pointer-events-none text-slate-400">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>

                    </div>
                  </div>
                </section>

                {/* Items Grid */}
                {isDataLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full mb-4"
                    />
                    <span className="text-sm font-sans-jakarta font-semibold text-slate-400">Memperbarui daftar tontonan...</span>
                  </div>
                ) : filteredWatchlist.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center max-w-xl mx-auto mt-6"
                    id="empty-state"
                  >
                    <div className="w-16 h-16 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-400 mx-auto mb-4 border border-slate-700">
                      <Film className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-sans-jakarta font-bold text-white mb-2">Watchlist Masih Kosong</h3>
                    <p className="text-sm font-sans-jakarta font-normal text-slate-400 mb-6 max-w-sm mx-auto">
                      Belum ada judul film atau serial yang cocok dengan pencarian Anda. Tonton film menarik, dan catat pengalamanmu di sini!
                    </p>
                    <button
                      onClick={openAddForm}
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-sans-jakarta font-semibold hover:bg-blue-500 transition-all border border-blue-500/30 cursor-pointer"
                      id="btn-empty-add"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Mulai Catat Sekarang</span>
                    </button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" id="watchlist-grid">
                    <AnimatePresence>
                      {filteredWatchlist.map((item) => {
                        return (
                          <motion.div
                            layout
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="relative aspect-[2/3] rounded-lg overflow-hidden border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-950/20 transition-all duration-300 group bg-slate-800 shadow-md"
                            id={`watchlist-card-${item.id}`}
                          >
                            {/* Card Poster section */}
                            {item.poster_path ? (
                              <img
                                src={item.poster_path}
                                alt={item.judul}
                                referrerPolicy="no-referrer"
                                className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLElement).parentElement;
                                  if (parent) {
                                    const fallback = parent.querySelector('.fallback-poster-box');
                                    if (fallback) fallback.classList.remove('hidden');
                                  }
                                }}
                              />
                            ) : null}

                            {/* Fallback Poster Box (Title text centered inside a gradient box) */}
                            <div className={`fallback-poster-box absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-blue-950/90 flex flex-col items-center justify-center p-4 text-center transition-all ${item.poster_path ? 'hidden' : ''}`}>
                              <div className="p-2 bg-blue-500/10 rounded-full border border-blue-500/20 mb-2 text-blue-400">
                                {item.kategori === 'Movie' ? <Film className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
                              </div>
                              <h4 className="text-xs md:text-sm font-sans-jakarta font-extrabold text-slate-100 leading-snug max-w-[90%] mb-1 drop-shadow">
                                {item.judul}
                              </h4>
                              <span className="text-[8px] font-mono tracking-wider text-blue-400 uppercase font-black px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">{item.kategori}</span>
                            </div>

                            {/* Rating badge top-left (ONLY shown if item has rating score) */}
                            {item.rating !== null && item.rating !== undefined && (
                              <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-700/50 z-2 shadow-sm">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-sans-jakarta font-black text-slate-100">{item.rating}</span>
                              </div>
                            )}

                            {/* Black gradient overlay for bottom text legibility */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none z-1" />

                            {/* Info overlay at bottom (Title & Status) */}
                            <div className="absolute inset-x-0 bottom-0 p-3 z-2 flex flex-col justify-end pointer-events-none">
                              <h4 className="text-xs md:text-sm font-sans-jakarta font-bold text-white line-clamp-2 drop-shadow-sm leading-tight mb-1 group-hover:text-blue-400 transition-colors">
                                {item.judul}
                              </h4>
                              <span className="text-[9px] font-sans-jakarta font-semibold text-slate-300 flex items-center gap-1">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                  item.status === 'Completed' ? 'bg-emerald-500' :
                                  item.status === 'Watching' ? 'bg-amber-500 animate-pulse' :
                                  'bg-blue-500'
                                }`} />
                                {getStatusLabel(item.status)}
                              </span>
                            </div>

                            {/* Hover overlay with full information and CRUD controls */}
                            <div className="absolute inset-0 bg-slate-950/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3.5 flex flex-col justify-between z-10">
                              <div className="space-y-2.5 overflow-y-auto pr-1">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                  <span className="text-[9px] font-mono tracking-widest text-blue-400 uppercase font-bold">{item.kategori}</span>
                                  {item.tahun_rilis && (
                                    <span className="text-[10px] font-mono text-slate-400">{item.tahun_rilis}</span>
                                  )}
                                </div>
                                <h4 className="text-xs font-sans-jakarta font-bold text-white leading-snug">
                                  {item.judul}
                                </h4>
                                
                                <div className="space-y-1.5 text-[11px]">
                                  {item.genre && (
                                    <div className="flex items-start gap-1 text-slate-300">
                                      <Tag className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                                      <span className="line-clamp-2">{item.genre}</span>
                                    </div>
                                  )}
                                  {item.negara && (
                                    <div className="flex items-center gap-1 text-slate-300">
                                      <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                                      <span className="truncate">{item.negara}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Review notes preview */}
                                <div className="border-t border-slate-800 pt-1.5">
                                  <span className="text-[8px] uppercase font-mono tracking-wider text-slate-500 font-bold block mb-0.5">Ulasan & Catatan</span>
                                  {item.review && item.review.trim() ? (
                                    <p className="text-[10px] text-slate-300 italic leading-relaxed line-clamp-3">
                                      "{item.review}"
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-slate-500 italic">Belum ada ulasan.</p>
                                  )}
                                </div>
                              </div>

                              {/* Action controls */}
                              <div className="border-t border-slate-800 pt-2.5 flex gap-1.5 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(item)}
                                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-sans-jakarta font-semibold rounded flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md"
                                  id={`btn-edit-${item.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id, item.judul)}
                                  className="p-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded border border-rose-500/30 transition-all cursor-pointer"
                                  title="Hapus Tontonan"
                                  id={`btn-delete-${item.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {/* profil akun view */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl mx-auto space-y-6 w-full animate-fade-in" id="view-profile">
                <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 shadow-lg text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-32 bg-blue-600" />
                  
                  {/* Avatar wrapper */}
                  <div className="relative z-10 pt-16">
                    <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-800 mx-auto shadow-md flex items-center justify-center text-white text-3xl font-sans-jakarta font-black">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <h2 className="text-2xl font-sans-jakarta font-bold text-white mt-4">{user.username}</h2>
                  <p className="text-sm font-sans-jakarta font-normal text-slate-400 mt-1">{user.email || `${user.username.toLowerCase()}@plottea.com`}</p>

                  <div className="mt-8 grid grid-cols-2 gap-4 border-t border-b border-slate-700 py-6">
                    <div>
                      <span className="block text-3xl font-sans-jakarta font-black text-white">{watchlist.length}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Judul</span>
                    </div>
                    <div>
                      <span className="block text-3xl font-sans-jakarta font-black text-white">{completedCount}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selesai Ditonton</span>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 text-rose-400 rounded-lg text-xs font-sans-jakarta font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center space-x-2"
                      id="btn-profile-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar dari Akun PlotTea</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ================= ADD / EDIT MODAL FORM ================= */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto" id="form-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 shadow-2xl relative my-8"
            >
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="absolute top-4 right-4 p-2 bg-slate-900 hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-200 transition-all border border-slate-700"
                id="btn-close-modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2.5 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 shadow-sm border border-slate-700">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-sans-jakarta font-bold text-slate-100">
                    {editingItem ? 'Edit Catatan Tontonan' : 'Catat Tontonan Baru'}
                  </h3>
                  <p className="text-xs font-sans-jakarta font-normal text-slate-400">Isi formulir lengkap untuk mendokumentasikan tontonan Anda.</p>
                </div>
              </div>

              <form 
                onSubmit={handleSaveItem} 
                action={editingItem ? `/api/watchlist/${editingItem.id}` : "/api/watchlist"} 
                method="POST" 
                className="space-y-4" 
                id="watchlist-form"
              >
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Judul Tontonan */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Judul Tontonan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Spirited Away, Attack on Titan"
                      value={formJudul}
                      onChange={(e) => setFormJudul(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-900 border border-slate-700 rounded-md text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-200 placeholder-slate-500"
                      id="form-judul"
                    />
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Kategori <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-900 border border-slate-700 rounded-md text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-200 cursor-pointer"
                      id="form-kategori"
                    >
                      <option value="Movie">Movie</option>
                      <option value="Drama Korea">Drama Korea</option>
                      <option value="Anime">Anime</option>
                      <option value="Variety Show">Variety Show</option>
                      <option value="Series">Series</option>
                    </select>
                  </div>

                  {/* Genre */}
                  <div>
                    <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Genre <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formGenre}
                      onChange={(e) => setFormGenre(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-900 border border-slate-700 rounded-md text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-200 cursor-pointer"
                      id="form-genre"
                      required
                    >
                      <option value="">Pilih Genre</option>
                      <option value="Action">Action</option>
                      <option value="Comedy">Comedy</option>
                      <option value="Drama">Drama</option>
                      <option value="Thriller">Thriller</option>
                      <option value="Sci-Fi">Sci-Fi</option>
                      <option value="Romance">Romance</option>
                      <option value="Fantasy">Fantasy</option>
                      <option value="Slice of Life">Slice of Life</option>
                      {formGenre && !['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Romance', 'Fantasy', 'Slice of Life'].includes(formGenre) && (
                        <option value={formGenre}>{formGenre}</option>
                      )}
                    </select>
                  </div>

                  {/* Tahun Rilis */}
                  <div>
                    <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Tahun Rilis <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g., 2001, 2024"
                      value={formTahun}
                      onChange={(e) => setFormTahun(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-900 border border-slate-700 rounded-md text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-200 placeholder-slate-500"
                      id="form-tahun"
                    />
                  </div>

                  {/* Negara Asal */}
                  <div>
                    <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Negara Asal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Jepang, Korea, USA"
                      value={formNegara}
                      onChange={(e) => setFormNegara(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-900 border border-slate-700 rounded-md text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-200 placeholder-slate-500"
                      id="form-negara"
                    />
                  </div>

                  {/* Status Menonton */}
                  <div className={formStatus === 'Completed' ? 'md:col-span-1' : 'md:col-span-2'}>
                    <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Status Menonton
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-900 border border-slate-700 rounded-md text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-200 cursor-pointer"
                      id="form-status"
                    >
                      <option value="To Watch">Rencana Tonton</option>
                      <option value="Watching">Sedang Ditonton</option>
                      <option value="Completed">Selesai Ditonton</option>
                      <option value="On Hold">Tertunda</option>
                      <option value="Dropped">Batal Ditonton</option>
                    </select>
                  </div>

                  {/* Rating Tontonan (hanya muncul jika Selesai Ditonton) */}
                  {formStatus === 'Completed' && (
                    <div>
                      <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between">
                        <span>Rating Tontonan</span>
                        <span className="font-sans-jakarta text-blue-400 font-bold">{formRating} / 10 Bintang</span>
                      </label>
                      <div className="flex items-center space-x-3 h-11 px-4 bg-slate-900 border border-slate-700 rounded-md">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={formRating}
                          onChange={(e) => setFormRating(e.target.value)}
                          className="w-full h-2 bg-slate-950 border border-slate-850 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          id="form-rating"
                        />
                      </div>
                    </div>
                  )}

                  {/* Catatan Ulasan & Review */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Catatan Ulasan & Review
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tulis opini, teori, atau perasaan setelah/saat menonton film atau serial ini..."
                      value={formReview}
                      onChange={(e) => setFormReview(e.target.value)}
                      className="w-full h-24 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-md text-sm font-sans-jakarta focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-200 resize-none placeholder-slate-500"
                      id="form-review"
                    />
                  </div>

                  {/* Poster Image upload */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-sans-jakarta font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Gambar Poster (Upload File - Opsional)
                    </label>
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer p-3 transition-all ${
                        dragActive 
                          ? 'border-blue-500 bg-blue-600/10' 
                          : formPosterFile 
                            ? 'border-emerald-500 bg-emerald-500/10' 
                            : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                      }`}
                      id="poster-dragzone"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <Upload className={`w-5 h-5 mb-1 ${formPosterFile ? 'text-emerald-400' : 'text-blue-500'}`} />
                      <span className="text-xs font-sans-jakarta font-semibold text-slate-300 text-center max-w-xs truncate">
                        {formPosterFile ? formPosterFile.name : 'Pilih file atau seret gambar ke sini'}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG, WEBP (Max 5MB)</span>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 border border-slate-700 hover:bg-slate-700 rounded-md text-xs font-sans-jakarta font-semibold text-slate-300 transition-all cursor-pointer"
                    id="btn-form-cancel"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-sans-jakarta font-semibold shadow-md transition-all cursor-pointer border border-blue-500/30"
                    id="btn-form-save"
                  >
                    {editingItem ? 'Perbarui Catatan' : 'Simpan Tontonan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= RAILWAY DEPLOYMENT GUIDE MODAL ================= */}
      <AnimatePresence>
        {isDeployModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto" id="deploy-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-800 rounded-lg p-6 sm:p-8 max-w-2xl w-full border border-slate-700 shadow-2xl relative my-8 text-left"
            >
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-slate-900 hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-200 transition-all border border-slate-700"
                id="btn-close-deploy-modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2.5 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 shadow-sm border border-slate-700">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-sans-jakarta font-bold text-slate-100">
                    Panduan Hosting ke Railway (Gratis/Murah) 🚀
                  </h3>
                  <p className="text-xs font-sans-jakarta font-normal text-slate-400">Langkah mudah mempublikasikan aplikasi PlotTea Node.js + MySQL Anda.</p>
                </div>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar text-sm text-slate-300 font-sans-jakarta">
                
                {/* Intro block */}
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 text-xs leading-relaxed">
                  <p className="font-semibold text-slate-200 mb-1">Kenapa memilih Railway?</p>
                  Railway merupakan salah satu platform cloud paling modern & mudah digunakan untuk mendeploy aplikasi full-stack Node.js + Database MySQL. Railway menyediakan trial gratis yang sangat cukup untuk menjalankan aplikasi portofolio seperti PlotTea secara online 24 jam.
                </div>

                {/* Step 1 */}
                <div className="space-y-2">
                  <h4 className="font-sans-jakarta font-bold text-slate-100 text-sm flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-mono font-bold border border-blue-500/20">1</span>
                    <span>Persiapan Repositori GitHub</span>
                  </h4>
                  <p className="text-xs leading-relaxed pl-8 text-slate-400">
                    Simpan seluruh berkas kode proyek ini ke dalam repositori GitHub pribadi Anda (misal: <code className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded font-mono border border-slate-800">github.com/username/plottea</code>). Pastikan file <code className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded font-mono border border-slate-800">package.json</code>, <code className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded font-mono border border-slate-800">server.ts</code>, dan direktori <code className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded font-mono border border-slate-800">server/</code> sudah ikut terunggah dengan baik.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                  <h4 className="font-sans-jakarta font-bold text-slate-100 text-sm flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-mono font-bold border border-blue-500/20">2</span>
                    <span>Membuat Database MySQL di Railway</span>
                  </h4>
                  <div className="text-xs leading-relaxed pl-8 space-y-1.5 text-slate-400">
                    <p>1. Masuk ke dashboard <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold underline">Railway.app</a> menggunakan akun GitHub Anda.</p>
                    <p>2. Klik tombol <strong>+ New Project</strong> lalu pilih opsi <strong>Provision MySQL</strong>.</p>
                    <p>3. Railway akan membuatkan instance database MySQL instan untuk Anda dalam waktu kurang dari 5 detik.</p>
                    <p>4. Buka tab <strong>Variables</strong> pada service MySQL tersebut untuk melihat info koneksi (Host, User, Password, Port, Database name).</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-2">
                  <h4 className="font-sans-jakarta font-bold text-slate-100 text-sm flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-mono font-bold border border-blue-500/20">3</span>
                    <span>Deploy Aplikasi Web di Railway</span>
                  </h4>
                  <div className="text-xs leading-relaxed pl-8 space-y-1.5 text-slate-400">
                    <p>1. Pada project dashboard Railway yang sama, klik tombol <strong>+ New Service</strong> atau <strong>+ Add Service</strong>.</p>
                    <p>2. Pilih <strong>GitHub Repo</strong> lalu cari dan tautkan repositori GitHub PlotTea Anda yang sudah dibuat pada langkah 1.</p>
                    <p>3. Railway akan mendeteksi secara otomatis bahwa aplikasi ini berbasis Node.js dan akan menjalankan build script <code className="bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-800">npm run build</code> dan start script <code className="bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-800">npm start</code> dari <code className="bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-800">package.json</code>.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="space-y-2">
                  <h4 className="font-sans-jakarta font-bold text-slate-100 text-sm flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-mono font-bold border border-blue-500/20">4</span>
                    <span>Konfigurasi Environment Variables di Railway</span>
                  </h4>
                  <div className="text-xs leading-relaxed pl-8 space-y-2 text-slate-400">
                    <p>Buka service web GitHub Anda di Railway, klik tab <strong>Variables</strong>, lalu tambahkan variabel lingkungan berikut sesuai konfigurasi MySQL Railway Anda:</p>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 font-mono text-[11px] text-slate-200 space-y-1">
                      <div><span className="text-blue-400">NODE_ENV</span>=production</div>
                      <div><span className="text-blue-400">PORT</span>=3000</div>
                      <div><span className="text-blue-400">SESSION_SECRET</span>=pilih_kata_rahasia_bebas</div>
                      <div><span className="text-blue-400">DB_HOST</span>=<em>(Gunakan host dari MySQL Service Railway, biasanya berbentuk domain)</em></div>
                      <div><span className="text-blue-400">DB_USER</span>=root</div>
                      <div><span className="text-blue-400">DB_PASSWORD</span>=<em>(Gunakan password dari tab variables MySQL)</em></div>
                      <div><span className="text-blue-400">DB_NAME</span>=railway</div>
                      <div><span className="text-blue-400">DB_PORT</span>=3306</div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic mt-1">💡 Tips: Anda juga dapat menggunakan fitur reference variable Railway untuk menghubungkan database secara otomatis dengan menuliskan <code className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded font-mono border border-slate-800">DB_HOST=${`{`}MYSQLHOST{"}"}</code>, <code className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded font-mono border border-slate-800">DB_PASSWORD=${`{`}MYSQLPASSWORD{"}"}</code>, dsb.</p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="space-y-2">
                  <h4 className="font-sans-jakarta font-bold text-slate-100 text-sm flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-mono font-bold border border-blue-500/20">5</span>
                    <span>Inisialisasi Tabel Database (Seeding)</span>
                  </h4>
                  <p className="text-xs leading-relaxed pl-8 text-slate-400">
                    Buka tab <strong>Queries</strong> pada MySQL database service di Railway, atau sambungkan aplikasi database klien (seperti TablePlus atau DBeaver) menggunakan data kredensial luar (External Connection URL). Kemudian eksekusi isi berkas query <strong className="font-mono bg-slate-950 text-slate-300 px-1 py-0.5 rounded border border-slate-800">schema.sql</strong> yang sudah tersedia di root folder PlotTea ini untuk membuat tabel <code className="font-mono bg-slate-950 text-slate-300 px-1 border border-slate-800">users</code> dan <code className="font-mono bg-slate-950 text-slate-300 px-1 border border-slate-800">watchlists</code> secara otomatis.
                  </p>
                </div>

                {/* Success block */}
                <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-xs leading-relaxed flex items-start space-x-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-emerald-300 mb-0.5">Selesai! Aplikasi Anda Siap Dikunjungi 🎉</span>
                    Setelah proses deploy selesai, Railway akan menyediakan domain publik berformat <code className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded font-mono">https://plottea-production.up.railway.app</code>. Anda dan teman-teman Anda sekarang dapat mengakses daftar tontonan PlotTea dari mana saja!
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-5 border-t border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer border border-blue-500/30"
                  id="btn-close-deploy-guide-modal"
                >
                  Selesai Membaca
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
