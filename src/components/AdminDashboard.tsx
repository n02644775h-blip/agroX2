import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Product, Report, Announcement, ProductCategory, AdRequest, AdStatus } from '../types';
import {
  subscribeToFirebaseUsers,
  fetchAllFirebaseUsers,
  updateFirebaseUserStatus,
  FirebaseSignupStats,
  calculateSignupStats
} from '../services/firebaseUsers';
import {
  subscribeToFirebaseAnnouncements,
  createFirebaseAnnouncement,
  deleteFirebaseAnnouncement
} from '../services/firebaseAnnouncements';
import { db } from '../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { sanitizeForFirestore } from '../context/AuthContext';
import {
  ShieldCheck,
  Users,
  Sprout,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Send,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Layers,
  FileText,
  TrendingUp,
  Tag,
  Flame,
  Clock,
  Eye,
  Check,
  X,
  ExternalLink,
  Receipt,
  FileCheck,
  CreditCard,
  MessageSquare,
  AlertCircle,
  Radio,
  RefreshCw,
  Search,
  Filter,
  UserPlus,
  UserCheck,
  Sparkles,
  ArrowUpRight,
  Wifi,
  Database
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [signupStats, setSignupStats] = useState<FirebaseSignupStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'reports' | 'announcements' | 'categories' | 'advertisers'>('overview');
  const [loading, setLoading] = useState(true);

  // Real-time Firebase Sync Status
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isSeedingUsers, setIsSeedingUsers] = useState(false);

  // User Filtering & Search
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'farmer' | 'buyer' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [userTimeFilter, setUserTimeFilter] = useState<'all' | 'today' | 'week'>('all');

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'urgent'>('normal');
  const [annTarget, setAnnTarget] = useState<'all' | 'farmers' | 'buyers'>('all');
  const [annCategory, setAnnCategory] = useState<'general' | 'logistics' | 'subsidy' | 'weather' | 'platform' | 'market_update'>('general');
  const [annPinned, setAnnPinned] = useState(false);
  const [annSuccess, setAnnSuccess] = useState(false);
  const [annError, setAnnError] = useState<string | null>(null);
  const [isPublishingAnn, setIsPublishingAnn] = useState(false);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);

  // Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Advertisers POP Viewer Modal
  const [viewingPopAd, setViewingPopAd] = useState<AdRequest | null>(null);
  const [adStatusFilter, setAdStatusFilter] = useState<'all' | 'submitted' | 'under_review' | 'approved' | 'rejected'>('all');
  const [adminNotesInput, setAdminNotesInput] = useState<{ [key: string]: string }>({});
  const [updatingAdId, setUpdatingAdId] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, apiUsersData, prodsData, repsData, catsData, annsData, adsData] = await Promise.all([
        api.getAdminStats(),
        api.getUsers().catch(() => []),
        api.getProducts({}),
        api.getReports(),
        api.getCategories(),
        api.getAnnouncements(),
        api.getAdRequests().catch(() => [])
      ]);
      setStats(statsData);
      setProducts(prodsData);
      setReports(repsData);
      setCategories(catsData);
      setAnnouncementsList(annsData);
      setAdRequests(adsData);

      // If Firestore users haven't populated yet, initialize with API users
      if (users.length === 0 && apiUsersData.length > 0) {
        setUsers(apiUsersData);
        setSignupStats(calculateSignupStats(apiUsersData, true));
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Firestore subscription on `users` and `announcements` collections
  useEffect(() => {
    loadAdminData();

    // Attach real-time snapshot listener for users
    const unsubscribeUsers = subscribeToFirebaseUsers(
      (fbUsers, fbStats) => {
        setUsers(fbUsers);
        setSignupStats(fbStats);
        setIsLiveConnected(true);
        setLastSyncTime(new Date().toLocaleTimeString());
      },
      (err) => {
        console.warn('Real-time Firestore user listener issue:', err);
        setIsLiveConnected(false);
      }
    );

    // Attach real-time snapshot listener for announcements
    const unsubscribeAnnouncements = subscribeToFirebaseAnnouncements('admin', (anns) => {
      setAnnouncementsList(anns);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeAnnouncements();
    };
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const fbUsers = await fetchAllFirebaseUsers();
      setUsers(fbUsers);
      setSignupStats(calculateSignupStats(fbUsers, true));
      setIsLiveConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncToast(`Successfully synced ${fbUsers.length} live users from Firebase!`);
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err) {
      console.error('Manual sync failed:', err);
      setSyncToast('Sync error: Check Firebase credentials.');
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Seed sample verified accounts to Firebase if user wants to populate initial test records
  const handleSeedDefaultUsersToFirebase = async () => {
    setIsSeedingUsers(true);
    try {
      const defaultUsers: Partial<User>[] = [
        {
          id: 'farmer-tendai-moyo',
          name: 'Tendai Moyo',
          email: 'tendai.moyo@greenfields.co.zw',
          phone: '+263 77 212 3456',
          role: 'farmer',
          avatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
          location: { country: 'Zimbabwe', province: 'Mashonaland East', city: 'Marondera', community: 'Ruzawi Valley' },
          status: 'active',
          farmerProfile: {
            farmName: 'GreenFields Organic Farm',
            bio: 'Specializing in organic heirloom vegetables and natural honey.',
            establishedYear: 2018,
            isVerified: true
          }
        },
        {
          id: 'farmer-chipo-sibanda',
          name: 'Chipo Sibanda',
          email: 'chipo@sunrisepoultry.co.zw',
          phone: '+263 71 889 0123',
          role: 'farmer',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
          location: { country: 'Zimbabwe', province: 'Midlands', city: 'Gweru', community: 'Thornhill Farmlands' },
          status: 'active',
          farmerProfile: {
            farmName: 'Sunrise Pastoral & Poultry',
            bio: 'Pasture-raised broiler chickens and farm-fresh graded brown eggs.',
            establishedYear: 2020,
            isVerified: true
          }
        },
        {
          id: 'buyer-tinashe-k',
          name: 'Tinashe Kuruneri',
          email: 'tinashe.k@freshgrocers.co.zw',
          phone: '+263 77 999 1122',
          role: 'buyer',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
          location: { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
          status: 'active'
        }
      ];

      for (const u of defaultUsers) {
        if (!u.id) continue;
        const userDocRef = doc(db, 'users', u.id);
        await setDoc(userDocRef, sanitizeForFirestore({
          uid: u.id,
          fullName: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          avatar: u.avatar,
          location: u.location,
          status: u.status,
          farmerProfile: u.farmerProfile,
          createdAt: serverTimestamp()
        }), { merge: true });
      }

      setSyncToast('Seeded verified platform users into Firebase Firestore!');
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err) {
      console.error('Failed to seed users:', err);
      setSyncToast('Seeding error: Ensure Firebase permissions are granted.');
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsSeedingUsers(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      // 1. Update in Firebase Firestore for instant real-time sync
      await updateFirebaseUserStatus(userId, next as any).catch(() => {});
      // 2. Also update in backend store
      await api.toggleUserStatus(userId, next).catch(() => {});
      // 3. Optimistic local update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: next as any } : u));
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await api.resolveReport(reportId, status, 'Resolved by Admin Portal');
      await loadAdminData();
    } catch (err) {
      console.error('Resolve report failed:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Permanently remove this product from marketplace?')) return;
    try {
      await api.deleteProduct(productId);
      await loadAdminData();
    } catch (err) {
      console.error('Delete product failed:', err);
    }
  };

  // Fixed Announcement Publication
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      setAnnError('Please provide both a headline and content for the announcement.');
      return;
    }

    try {
      setIsPublishingAnn(true);
      setAnnError(null);
      const payload: Partial<Announcement> = {
        title: annTitle.trim(),
        content: annContent.trim(),
        priority: annPriority,
        targetAudience: annTarget,
        author: 'agroX Admin Team',
        authorRole: 'admin',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        category: annCategory,
        pinned: annPinned,
        reactions: { '👍': 1 },
        likesCount: 1
      };

      const created = await createFirebaseAnnouncement(payload);
      try {
        await api.createAnnouncement(payload);
      } catch (err) {
        console.warn('API announcement store fallback:', err);
      }

      setAnnSuccess(true);
      setAnnouncementsList(prev => [created, ...prev.filter(a => a.id !== created.id)]);
      setAnnTitle('');
      setAnnContent('');
      setAnnPriority('normal');
      setAnnTarget('all');
      setAnnPinned(false);
      setTimeout(() => setAnnSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to publish announcement:', err);
      setAnnError(err?.message || 'Failed to broadcast announcement. Please try again.');
    } finally {
      setIsPublishingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!confirm('Remove this announcement broadcast?')) return;
    try {
      setAnnouncementsList(prev => prev.filter(a => a.id !== annId));
      await deleteFirebaseAnnouncement(annId);
      try {
        await api.deleteAnnouncement(annId);
      } catch {}
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  // Advertisers Approval / Status Handlers
  const handleUpdateAdStatus = async (adId: string, status: AdStatus) => {
    setUpdatingAdId(adId);
    try {
      const notes = adminNotesInput[adId] || '';
      await api.updateAdRequestStatus(adId, status, notes);
      await loadAdminData();
      if (viewingPopAd && viewingPopAd.id === adId) {
        setViewingPopAd(prev => prev ? { ...prev, status, adminNotes: notes } : null);
      }
    } catch (err) {
      console.error('Failed to update ad status:', err);
    } finally {
      setUpdatingAdId(null);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Permanently delete this advertisement request?')) return;
    try {
      await api.deleteAdRequest(adId);
      await loadAdminData();
      if (viewingPopAd && viewingPopAd.id === adId) {
        setViewingPopAd(null);
      }
    } catch (err) {
      console.error('Failed to delete ad request:', err);
    }
  };

  const pendingAdsCount = adRequests.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
  const filteredAds = adRequests.filter(a => {
    if (adStatusFilter === 'all') return true;
    return a.status === adStatusFilter;
  });

  // Filtered users for table
  const filteredUsers = users.filter(u => {
    // Search
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase().trim();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q);
      const matchCity = u.location?.city?.toLowerCase().includes(q);
      const matchFarm = u.farmerProfile?.farmName?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchCity && !matchFarm) {
        return false;
      }
    }

    // Role
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) {
      return false;
    }

    // Status
    if (userStatusFilter !== 'all' && u.status !== userStatusFilter) {
      return false;
    }

    // Time
    if (userTimeFilter !== 'all') {
      const created = new Date(u.createdAt);
      const now = new Date();
      if (isNaN(created.getTime())) return true;
      if (userTimeFilter === 'today') {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (created < oneDayAgo) return false;
      } else if (userTimeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (created < oneWeekAgo) return false;
      }
    }

    return true;
  });

  const totalSignups = users.length;
  const farmersCount = signupStats ? signupStats.farmersCount : users.filter(u => u.role === 'farmer').length;
  const buyersCount = signupStats ? signupStats.buyersCount : users.filter(u => u.role === 'buyer').length;
  const signupsToday = signupStats ? signupStats.signupsToday : 0;
  const signupsThisWeek = signupStats ? signupStats.signupsThisWeek : 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-xs font-semibold backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-purple-300" />
            Platform Administration & Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            agroX Executive Controls
          </h1>
          <p className="text-purple-200 text-xs sm:text-sm">
            Live Firebase user registration analytics, farmer ad requests, catalog moderation, and platform broadcasts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="admin-nav-advertisers-btn"
            onClick={() => setActiveTab('advertisers')}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shrink-0 transition-colors cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
            Advertisers {pendingAdsCount > 0 && `(${pendingAdsCount} Pending)`}
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shrink-0 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Broadcast Update
          </button>
        </div>
      </div>

      {/* Real-time Firebase Sync Status Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="relative flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-700" />
                Firebase Real-time Signups Sync
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 tracking-wider">
                Live & Streaming
              </span>
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              Connected to Cloud Firestore database <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700 font-mono">ai-studio-agrox</code> • Instant updates enabled
              {lastSyncTime && ` • Last update at ${lastSyncTime}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalSignups === 0 && (
            <button
              onClick={handleSeedDefaultUsersToFirebase}
              disabled={isSeedingUsers}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center gap-1.5 transition-colors border border-purple-200 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isSeedingUsers ? 'Seeding...' : 'Populate Verified Users'}
            </button>
          )}

          <button
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin text-purple-700' : 'text-stone-600'}`} />
            {isManualSyncing ? 'Syncing...' : 'Force Sync'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Signups */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-xs text-purple-900 font-bold">Total Signups</div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-3xl font-black text-purple-900 mt-1">{totalSignups}</div>
          <div className="text-[11px] text-purple-700 font-semibold mt-0.5 flex items-center gap-1">
            <span>+{signupsToday} today</span>
            <span className="text-stone-400">•</span>
            <span>+{signupsThisWeek} this week</span>
          </div>
        </div>

        {/* Registered Farmers */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Registered Farmers</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {farmersCount}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Agricultural Producers</div>
        </div>

        {/* Registered Buyers */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Registered Buyers</div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {buyersCount}
          </div>
          <div className="text-[11px] text-blue-600 mt-0.5">Wholesalers & Consumers</div>
        </div>

        {/* Ad Requests */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Ad Requests</div>
          <div className="text-2xl font-black text-orange-600 mt-1">{adRequests.length}</div>
          <div className="text-[11px] text-orange-700 font-medium">
            {pendingAdsCount} awaiting review
          </div>
        </div>

        {/* Products */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Total Products</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{products.length}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Listed Produce</div>
        </div>

        {/* Pending Reports */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Pending Reports</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {reports.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-[11px] text-red-500 mt-0.5">Needs Review</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Platform Analytics' },
          { id: 'users', label: `Live Signups & Users (${users.length})`, highlight: signupsToday > 0 },
          { id: 'advertisers', label: `Advertisers (${adRequests.length})`, highlight: pendingAdsCount > 0 },
          { id: 'products', label: `Catalog Moderation (${products.length})` },
          { id: 'reports', label: `Reports (${reports.length})` },
          { id: 'announcements', label: `Broadcast Announcements (${announcementsList.length})` },
          { id: 'categories', label: `Categories (${categories.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? tab.id === 'advertisers'
                  ? 'bg-orange-600 text-white'
                  : 'bg-purple-800 text-white'
                : tab.highlight
                ? 'text-purple-900 bg-purple-100 hover:bg-purple-200'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {tab.id === 'advertisers' && <Flame className="w-3.5 h-3.5 text-amber-300" />}
            {tab.id === 'users' && <Users className="w-3.5 h-3.5 text-emerald-500" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Signups & User Growth */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Firebase User Signups Timeline</h3>
                  <p className="text-xs text-stone-500">Live breakdown of farmer vs buyer registrations by month</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Farmers
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Buyers
                  </span>
                </div>
              </div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signupStats?.signupsByMonth || stats?.volumeChart || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1C1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="farmers" fill="#059669" name="Farmers" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="buyers" fill="#2563EB" name="Buyers" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Marketplace Volume ($) */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Marketplace Transaction Volume ($)</h3>
                  <p className="text-xs text-stone-500">Gross transaction turnover through platform farm-gate sales</p>
                </div>
                <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  GMV: ${stats?.totalVolume ? stats.totalVolume.toFixed(2) : '155.00'}
                </span>
              </div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.volumeChart || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1C1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: number) => [`$${val}`, 'Gross Sales']}
                    />
                    <Line type="monotone" dataKey="volume" stroke="#7E22CE" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Real-Time Signups Feed */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-stone-900 text-base">Live Real-Time Signups Stream</h3>
              </div>
              <button
                onClick={() => setActiveTab('users')}
                className="text-xs font-bold text-purple-800 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                View all ({users.length})
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-stone-200 rounded-2xl p-6 space-y-3">
                <Users className="w-10 h-10 text-stone-300 mx-auto" />
                <div className="text-sm font-bold text-stone-700">No registered signups recorded yet in Firestore</div>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  New registrations via the Login/Signup modal will appear here instantly in real-time. You can also seed initial verified platform producers.
                </p>
                <button
                  onClick={handleSeedDefaultUsersToFirebase}
                  disabled={isSeedingUsers}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  {isSeedingUsers ? 'Seeding...' : 'Populate Verified Accounts'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {users.slice(0, 6).map(u => (
                  <div key={u.id} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/60 flex items-start gap-3 hover:bg-stone-50 transition-colors">
                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-stone-200 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="font-bold text-stone-900 text-xs truncate">{u.name}</div>
                        <span className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase ${
                          u.role === 'farmer' ? 'bg-emerald-100 text-emerald-900' : u.role === 'buyer' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 truncate">{u.email}</div>
                      {u.farmerProfile?.farmName && (
                        <div className="text-[10px] font-semibold text-emerald-800 truncate mt-0.5">
                          🌾 {u.farmerProfile.farmName}
                        </div>
                      )}
                      <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
                        <span>📍 {u.location?.city || 'Harare'}</span>
                        <span className="text-[9px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filtering Header */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search registered users by name, email, farm, phone, city..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Role filter */}
              <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs">
                {(['all', 'farmer', 'buyer', 'admin'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setUserRoleFilter(role)}
                    className={`px-3 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                      userRoleFilter === role
                        ? 'bg-white text-purple-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {role === 'all' ? 'All Roles' : role}
                  </button>
                ))}
              </div>

              {/* Time filter */}
              <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today (24h)' },
                  { id: 'week', label: 'This Week' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setUserTimeFilter(t.id as any)}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      userTimeFilter === t.id
                        ? 'bg-white text-purple-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-stone-900 text-sm">Registered Accounts ({filteredUsers.length})</h3>
              </div>
              <span className="text-xs text-stone-500 font-medium">
                Live stream updating from Firestore
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 p-6 space-y-3">
                <Users className="w-12 h-12 text-stone-300 mx-auto" />
                <h4 className="font-bold text-stone-800 text-base">No matching signups found</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {users.length === 0
                    ? 'No user documents currently exist in Firestore collection "users". Use the button below to seed accounts or perform a registration.'
                    : 'Try clearing your search query or adjusting role/date filters.'}
                </p>
                {users.length === 0 && (
                  <button
                    onClick={handleSeedDefaultUsersToFirebase}
                    disabled={isSeedingUsers}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isSeedingUsers ? 'Seeding...' : 'Populate Verified Producers'}
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">User & Identity</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Location & Farm</th>
                      <th className="px-4 py-3">Signed Up</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-100 shrink-0" />
                            <div>
                              <div className="font-bold text-stone-900">{u.name}</div>
                              <div className="text-[11px] text-stone-400">{u.email}</div>
                              {u.phone && <div className="text-[10px] text-stone-500">{u.phone}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            u.role === 'farmer' ? 'bg-emerald-100 text-emerald-900' : u.role === 'buyer' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          <div className="font-semibold text-stone-900">{u.location?.city || 'Harare'}, {u.location?.province || 'Harare'}</div>
                          {u.farmerProfile?.farmName && (
                            <div className="text-[11px] text-emerald-700 font-medium">
                              🌾 {u.farmerProfile.farmName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-stone-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Recent'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.status)}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                              u.status === 'active' ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ADVERTISERS (Approve / Decline / Check POPs) */}
      {activeTab === 'advertisers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600 fill-orange-500" />
                <h2 className="text-lg font-bold text-stone-900">Farmer Advertisement Requests & POP Approvals</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Review farmer Hot Deals submissions, verify Proof of Payments (POP), and approve or decline $1/day promotions.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                { id: 'all', label: 'All Requests' },
                { id: 'submitted', label: 'Sent / New' },
                { id: 'under_review', label: 'Under Review' },
                { id: 'approved', label: 'Approved (Live Deals)' },
                { id: 'rejected', label: 'Rejected' }
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setAdStatusFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    adStatusFilter === pill.id
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAds.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-6 space-y-3">
              <Flame className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-bold text-stone-800 text-base">No advertisement requests found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {adStatusFilter === 'all'
                  ? 'No farmers have submitted ad requests yet. Farmers can request ads at $1/day from their dashboard.'
                  : `No requests match the "${adStatusFilter}" filter.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAds.map(ad => {
                const isSent = ad.status === 'submitted';
                const isUnderReview = ad.status === 'under_review';
                const isApproved = ad.status === 'approved';
                const isRejected = ad.status === 'rejected';

                return (
                  <div
                    key={ad.id}
                    className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                      isSent
                        ? 'border-blue-300 bg-blue-50/20'
                        : isUnderReview
                        ? 'border-amber-300 bg-amber-50/20'
                        : isApproved
                        ? 'border-emerald-300'
                        : 'border-stone-200 opacity-90'
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <Flame className="w-5 h-5 fill-orange-500 text-orange-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-stone-900 text-base">{ad.dealHeadline}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isSent
                                  ? 'bg-blue-100 text-blue-800'
                                  : isUnderReview
                                  ? 'bg-amber-100 text-amber-900'
                                  : isApproved
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-red-100 text-red-900'
                              }`}
                            >
                              {ad.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 mt-0.5">
                            Farmer: <strong>{ad.farmerName}</strong> ({ad.farmName}) • {ad.farmerPhone || 'No phone'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-xs text-stone-400">Campaign Fee</div>
                          <div className="text-base font-black text-emerald-800">${ad.totalFee.toFixed(2)}</div>
                        </div>
                        <div className="text-xs text-stone-400">
                          <div>Duration</div>
                          <div className="font-bold text-stone-800">{ad.durationDays} Days ($1/day)</div>
                        </div>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="bg-stone-50 p-3.5 rounded-2xl space-y-1">
                        <div className="text-stone-400 font-semibold text-[11px]">Product & Discount</div>
                        <div className="font-bold text-stone-900 text-sm">{ad.productName}</div>
                        <div className="text-orange-700 font-bold">Offer: {ad.discountText}</div>
                        <div className="text-stone-500 mt-1 line-clamp-2">{ad.dealDescription}</div>
                      </div>

                      <div className="bg-stone-50 p-3.5 rounded-2xl space-y-1">
                        <div className="text-stone-400 font-semibold text-[11px]">Payment Verification</div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase text-stone-800">{ad.paymentMethod}</span>
                          {ad.paymentReference && (
                            <span className="font-mono text-stone-500">Ref: {ad.paymentReference}</span>
                          )}
                        </div>
                        {ad.proofOfPaymentUrl ? (
                          <button
                            onClick={() => setViewingPopAd(ad)}
                            className="mt-2 text-xs font-bold text-orange-700 hover:text-orange-800 underline flex items-center gap-1 cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-orange-600" />
                            View Attached POP Receipt
                          </button>
                        ) : (
                          <div className="text-amber-700 font-medium mt-1">No proof of payment uploaded</div>
                        )}
                      </div>

                      <div className="bg-stone-50 p-3.5 rounded-2xl space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="text-stone-400 font-semibold text-[11px]">Admin Decision Notes</div>
                          <input
                            type="text"
                            placeholder="Add reason or note for farmer..."
                            defaultValue={ad.adminNotes || ''}
                            onChange={e => setAdminNotesInput({ ...adminNotesInput, [ad.id]: e.target.value })}
                            className="w-full text-xs p-1.5 bg-white border border-stone-200 rounded-lg mt-1 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {ad.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateAdStatus(ad.id, 'approved')}
                              disabled={updatingAdId === ad.id}
                              className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve Ad
                            </button>
                          )}

                          {ad.status !== 'under_review' && ad.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateAdStatus(ad.id, 'under_review')}
                              disabled={updatingAdId === ad.id}
                              className="py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                            >
                              Review
                            </button>
                          )}

                          {ad.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateAdStatus(ad.id, 'rejected')}
                              disabled={updatingAdId === ad.id}
                              className="py-1.5 px-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Decline
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* POP Full-Screen Inspection Modal */}
      {viewingPopAd && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-stone-900 text-base">
                  Proof of Payment: {viewingPopAd.farmerName}
                </h3>
              </div>
              <button
                onClick={() => setViewingPopAd(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <div><strong>Deal Headline:</strong> {viewingPopAd.dealHeadline}</div>
              <div><strong>Method:</strong> {viewingPopAd.paymentMethod.toUpperCase()}</div>
              <div><strong>Duration:</strong> {viewingPopAd.durationDays} Days @ $1/day</div>
              <div><strong>Amount Due:</strong> <span className="font-bold text-emerald-800">${viewingPopAd.totalFee.toFixed(2)}</span></div>
              <div><strong>Ref ID:</strong> {viewingPopAd.paymentReference || 'N/A'}</div>
              <div><strong>Status:</strong> <span className="uppercase font-bold text-orange-600">{viewingPopAd.status}</span></div>
            </div>

            {/* Image Preview Container */}
            <div className="max-h-96 overflow-auto rounded-2xl border border-stone-200 bg-stone-900 flex items-center justify-center p-2">
              <img
                src={viewingPopAd.proofOfPaymentUrl}
                alt="Proof of Payment"
                className="max-h-80 w-auto rounded-xl object-contain"
              />
            </div>

            {/* Decision Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleUpdateAdStatus(viewingPopAd.id, 'rejected')}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Decline POP
              </button>
              <button
                onClick={() => handleUpdateAdStatus(viewingPopAd.id, 'approved')}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Approve & Launch Hot Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">Active Product Listings ({products.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Producer</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map(prod => (
                  <tr key={prod.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={prod.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover bg-stone-100" />
                        <div>
                          <div className="font-bold text-stone-900">{prod.name}</div>
                          <div className="text-[11px] text-stone-400">{prod.categoryName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-medium">
                      {prod.farmerName} ({prod.farmName})
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-800">
                      ${prod.price.toFixed(2)} / {prod.unit}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        prod.availability === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {prod.quantityAvailable} {prod.unit}s
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove Listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">Marketplace Incident & Content Reports</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {reports.map(rep => (
              <div key={rep.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">{rep.reason.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rep.status === 'pending' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-stone-600">{rep.description}</p>
                </div>
                {rep.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResolveReport(rep.id, 'resolved')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer transition-colors"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleResolveReport(rep.id, 'dismissed')}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-base">Broadcast Platform Announcement</h3>
            {annSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Broadcast successfully published!
              </div>
            )}
            {annError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                {annError}
              </div>
            )}
            <form onSubmit={handleSendAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700">Headline</label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="e.g. Harare Regional Logistics Subsidy Launched"
                  className="w-full mt-1 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700">Target Group</label>
                  <select
                    value={annTarget}
                    onChange={e => setAnnTarget(e.target.value as any)}
                    className="w-full mt-1 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  >
                    <option value="all">Everyone</option>
                    <option value="farmers">Farmers & Producers</option>
                    <option value="buyers">Buyers & Wholesalers</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700">Urgency Level</label>
                  <select
                    value={annPriority}
                    onChange={e => setAnnPriority(e.target.value as any)}
                    className="w-full mt-1 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="urgent">Urgent / Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700">Announcement Body</label>
                <textarea
                  rows={4}
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  placeholder="Detailed broadcast content for stakeholders..."
                  className="w-full mt-1 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isPublishingAnn}
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {isPublishingAnn ? 'Broadcasting...' : 'Publish Official Broadcast'}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-base">Past Platform Broadcasts ({announcementsList.length})</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {announcementsList.map(ann => (
                <div key={ann.id} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">{ann.title}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ann.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {ann.priority}
                      </span>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50"
                        title="Delete broadcast"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-stone-600 line-clamp-2">{ann.content}</p>
                  <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100">
                    <span>Target: {ann.targetAudience}</span>
                    <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-bold text-stone-900 text-base">Agricultural Catalog Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map(cat => (
              <div key={cat.id} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-stone-900">{cat.name}</div>
                  <div className="text-[11px] text-stone-500">{cat.slug}</div>
                </div>
                <Tag className="w-4 h-4 text-purple-700" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
