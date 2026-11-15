import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Product, Report, Announcement, ProductCategory, AdRequest, AdStatus, isSellerRole } from '../types';
import {
  subscribeToFirebaseUsers,
  fetchAllFirebaseUsers,
  updateFirebaseUserStatus,
  deleteFirebaseUserAccount,
  FirebaseSignupStats,
  calculateSignupStats
} from '../services/firebaseUsers';
import {
  subscribeToFirebaseAnnouncements,
  createFirebaseAnnouncement,
  deleteFirebaseAnnouncement
} from '../services/firebaseAnnouncements';
import {
  subscribeToFirebaseAdRequests,
  updateFirebaseAdRequestStatus,
  deleteFirebaseAdRequest,
  expireFirebaseAdRequest
} from '../services/firebaseAdRequests';
import { db } from '../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { sanitizeForFirestore, useAuth } from '../context/AuthContext';
import { compressImage } from '../utils/imageCompressor';
import { getAdLifecycle, getAdStatusBadgeMeta, formatAdDate } from '../utils/adLifecycle';
import {
  LiquidGlassCard,
  LiquidGlassButton,
  LiquidGlassModal,
  LiquidGlassSidebar,
  type SidebarNavItem
} from './glass';
import heroFarmlandSunrise from '../assets/images/hero_farmland_sunrise_1794742072298.jpg';
import {
  ShieldCheck,
  Users,
  ShoppingBag,
  AlertTriangle,
  Send,
  CheckCircle,
  Trash2,
  Tag,
  Flame,
  Check,
  X,
  Receipt,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Search,
  UserPlus,
  Sparkles,
  ArrowUpRight,
  Database,
  Camera,
  Upload,
  LayoutDashboard,
  Megaphone,
  Menu
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

const ADMIN_PRESET_AVATARS = [
  { label: 'Executive Shield', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' },
  { label: 'Agronomy Director', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400' },
  { label: 'Operations Lead', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400' },
  { label: 'Governance Lead', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400' }
];

type AdminTabId =
  | 'overview'
  | 'users'
  | 'advertisers'
  | 'products'
  | 'reports'
  | 'announcements'
  | 'categories';

export const AdminDashboard: React.FC = () => {
  const { user: adminUser, updateUserProfile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [signupStats, setSignupStats] = useState<FirebaseSignupStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Admin Profile Picture Edit Modal
  const [showAdminAvatarModal, setShowAdminAvatarModal] = useState(false);
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState<string | null>(null);
  const [pendingDeleteAnnId, setPendingDeleteAnnId] = useState<string | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<User | null>(null);
  const [deleteForceConfirm, setDeleteForceConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Spam / policy violation');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [deleteBlockingOrders, setDeleteBlockingOrders] = useState<string[]>([]);
  const [adminAvatarDraft, setAdminAvatarDraft] = useState(
    adminUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
  );
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Real-time Firebase Sync Status
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isSeedingUsers, setIsSeedingUsers] = useState(false);

  // User Filtering & Search
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'farmer' | 'fodder_supplier' | 'buyer' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [userTimeFilter, setUserTimeFilter] = useState<'all' | 'today' | 'week'>('all');

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'urgent'>('normal');
  const [annTarget, setAnnTarget] = useState<'all' | 'farmers' | 'buyers'>('all');
  const [annPinned, setAnnPinned] = useState(false);
  const [annSuccess, setAnnSuccess] = useState(false);
  const [annError, setAnnError] = useState<string | null>(null);
  const [isPublishingAnn, setIsPublishingAnn] = useState(false);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);

  // Advertisers POP Viewer Modal
  const [viewingPopAd, setViewingPopAd] = useState<AdRequest | null>(null);
  const [adStatusFilter, setAdStatusFilter] = useState<'all' | 'pending' | 'approved' | 'active' | 'expired' | 'rejected'>('all');
  const [adminNotesInput, setAdminNotesInput] = useState<{ [key: string]: string }>({});
  const [updatingAdId, setUpdatingAdId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const loadAdminData = async () => {
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

      if (users.length === 0 && apiUsersData.length > 0) {
        setUsers(apiUsersData);
        setSignupStats(calculateSignupStats(apiUsersData, true));
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    loadAdminData();

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

    const unsubscribeAnnouncements = subscribeToFirebaseAnnouncements('admin', (anns) => {
      setAnnouncementsList(anns);
    });

    const unsubscribeAds = subscribeToFirebaseAdRequests(
      undefined,
      (fbAds) => {
        if (fbAds && fbAds.length > 0) {
          setAdRequests(fbAds);
        }
      },
      (err) => {
        console.warn('Real-time Firestore ad requests listener issue:', err);
      }
    );

    const adTicker = setInterval(() => setNowMs(Date.now()), 30000);

    return () => {
      unsubscribeUsers();
      unsubscribeAnnouncements();
      unsubscribeAds();
      clearInterval(adTicker);
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
      setSyncToast(`Successfully synced ${fbUsers.length} live users from Firebase.`);
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err) {
      console.error('Manual sync failed:', err);
      setSyncToast('Sync error: Check Firebase credentials.');
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsManualSyncing(false);
    }
  };

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

      setSyncToast('Seeded verified platform users into Firebase Firestore.');
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err) {
      console.error('Failed to seed users:', err);
      setSyncToast('Seeding error: Ensure Firebase permissions are granted.');
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsSeedingUsers(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string, userEmail?: string) => {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateFirebaseUserStatus(userId, next as any, userEmail).catch((err) => {
        console.warn('Firestore status update warning:', err);
      });
      await api.toggleUserStatus(userId, next, userEmail).catch((err) => {
        console.warn('API status update warning:', err);
      });
      setUsers(prev =>
        prev.map(u =>
          u.id === userId || (userEmail && u.email?.toLowerCase() === userEmail.toLowerCase())
            ? { ...u, status: next as any }
            : u
        )
      );
      setSyncToast(`Account ${next === 'suspended' ? 'suspended — login access revoked' : 'reactivated'}.`);
      setTimeout(() => setSyncToast(null), 3500);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleOpenDeleteUserModal = (target: User) => {
    if (target.id === adminUser?.id) return;
    setPendingDeleteUser(target);
    setDeleteForceConfirm(false);
    setDeleteReason('Spam / policy violation');
    setDeleteUserError(null);
    setDeleteBlockingOrders([]);
  };

  const handleConfirmDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDeleteUser || !adminUser?.id) return;
    if (pendingDeleteUser.id === adminUser.id) {
      setDeleteUserError('You cannot delete your own active administrator account.');
      return;
    }

    const target = pendingDeleteUser;
    const isSeller = isSellerRole(target.role);

    setDeletingUserId(target.id);
    setDeleteUserError(null);
    setDeleteBlockingOrders([]);

    try {
      try {
        await api.adminDeleteUser(target.id, {
          actingAdminId: adminUser.id,
          email: target.email,
          force: deleteForceConfirm,
          reason: deleteReason.trim()
        });
      } catch (apiErr: any) {
        const msg = apiErr?.message || '';
        if (msg.toLowerCase().includes('active or unverified order')) {
          const matchOrders = msg.match(/\(([^)]+)\)/);
          if (matchOrders?.[1]) {
            setDeleteBlockingOrders(matchOrders[1].split(',').map((s: string) => s.trim()).filter(Boolean));
          }
          throw apiErr;
        }
        if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('cannot delete your own')) {
          throw apiErr;
        }
        console.warn('Backend admin delete warning (continuing Firebase deletion):', msg);
      }

      await deleteFirebaseUserAccount({
        userId: target.id,
        email: target.email,
        isSeller,
        force: deleteForceConfirm,
        deletedByAdminId: adminUser.id,
        reason: deleteReason.trim()
      });

      const targetEmailLower = target.email?.trim().toLowerCase();
      setUsers(prev => {
        const nextUsers = prev.filter(
          u => u.id !== target.id && (!targetEmailLower || u.email?.trim().toLowerCase() !== targetEmailLower)
        );
        setSignupStats(calculateSignupStats(nextUsers, true));
        return nextUsers;
      });
      setProducts(prev => prev.filter(p => p.farmerId !== target.id));
      setAdRequests(prev => prev.filter(a => a.farmerId !== target.id));

      setPendingDeleteUser(null);
      setSyncToast(`Permanently deleted ${target.name} and synced cleanup to Firebase.`);
      setTimeout(() => setSyncToast(null), 4500);
    } catch (err: any) {
      console.error('Admin delete user failed:', err);
      setDeleteUserError(err?.message || 'Failed to delete user account. Please try again.');
    } finally {
      setDeletingUserId(null);
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
    setPendingDeleteProductId(null);
    try {
      await api.deleteProduct(productId);
      await loadAdminData();
    } catch (err) {
      console.error('Delete product failed:', err);
    }
  };

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
        author: adminUser?.name || 'FarmBridge Admin Team',
        authorRole: 'admin',
        authorAvatar:
          adminUser?.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        category: 'general',
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
    setPendingDeleteAnnId(null);
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

  const handleUpdateAdStatus = async (adId: string, status: AdStatus) => {
    setUpdatingAdId(adId);
    try {
      const targetAd = adRequests.find(a => a.id === adId);
      const durationDays = targetAd ? getAdLifecycle(targetAd, nowMs).durationDays : undefined;
      const notes = adminNotesInput[adId] || '';
      if (status === 'expired') {
        await expireFirebaseAdRequest(adId).catch(() => {});
      } else {
        await updateFirebaseAdRequestStatus(adId, status, notes, adminUser?.name, durationDays).catch(fbErr => {
          console.warn('Firebase ad status update warning:', fbErr);
        });
      }
      await api.updateAdRequestStatus(adId, status, notes).catch(() => {});
      await loadAdminData();
      if (viewingPopAd && viewingPopAd.id === adId) {
        setViewingPopAd(prev => prev ? { ...prev, status, adminNotes: notes } : null);
      }
      setSyncToast(`Advertisement status updated to ${status.replace(/_/g, ' ')}.`);
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err) {
      console.error('Failed to update ad status:', err);
    } finally {
      setUpdatingAdId(null);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    try {
      await deleteFirebaseAdRequest(adId).catch(fbErr => {
        console.warn('Firebase delete ad request warning:', fbErr);
      });
      await api.deleteAdRequest(adId).catch(() => {});
      await loadAdminData();
      if (viewingPopAd && viewingPopAd.id === adId) {
        setViewingPopAd(null);
      }
      setSyncToast('Advertisement request deleted.');
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err) {
      console.error('Failed to delete ad request:', err);
    }
  };

  const pendingAdsCount = adRequests.filter(a => getAdLifecycle(a, nowMs).effectiveStatus === 'pending').length;
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  const filteredAds = adRequests.filter(a => {
    if (adStatusFilter === 'all') return true;
    const eff = getAdLifecycle(a, nowMs).effectiveStatus;
    if (adStatusFilter === 'approved') {
      return eff === 'approved' || eff === 'active';
    }
    return eff === adStatusFilter;
  });

  const filteredUsers = users.filter(u => {
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

    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) {
      return false;
    }

    if (userStatusFilter !== 'all' && u.status !== userStatusFilter) {
      return false;
    }

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
  const farmersCount = signupStats
    ? signupStats.farmersCount
    : users.filter(u => u.role === 'farmer' || u.role === 'fodder_supplier').length;
  const buyersCount = signupStats
    ? signupStats.buyersCount
    : users.filter(u => u.role === 'buyer').length;
  const signupsToday = signupStats ? signupStats.signupsToday : 0;
  const signupsThisWeek = signupStats ? signupStats.signupsThisWeek : 0;

  const handleOpenAdminAvatarModal = () => {
    setAdminAvatarDraft(
      adminUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
    );
    setAvatarError('');
    setShowAdminAvatarModal(true);
  };

  const handleAdminAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5MB.');
      return;
    }
    setAvatarError('');
    try {
      const compressed = await compressImage(file, 400, 400, 0.85);
      setAdminAvatarDraft(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setAdminAvatarDraft(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAdminAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminAvatarDraft.trim()) {
      setAvatarError('Please select or enter an image URL.');
      return;
    }
    setIsSavingAvatar(true);
    setAvatarError('');
    try {
      await updateUserProfile({ avatar: adminAvatarDraft.trim() });
      setShowAdminAvatarModal(false);
      setSyncToast('Admin profile picture updated.');
      setTimeout(() => setSyncToast(null), 3500);
    } catch (err: any) {
      setAvatarError(err?.message || 'Failed to update profile picture.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const sidebarItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Platform Analytics', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'Users & Signups', icon: <Users className="w-4 h-4" />, badge: users.length },
    {
      id: 'advertisers',
      label: 'Advertisements',
      icon: <Flame className="w-4 h-4" />,
      badge: pendingAdsCount || adRequests.length,
      buttonId: 'admin-sidebar-advertisers-btn'
    },
    { id: 'products', label: 'Catalog Moderation', icon: <ShoppingBag className="w-4 h-4" />, badge: products.length },
    { id: 'reports', label: 'Reports', icon: <AlertTriangle className="w-4 h-4" />, badge: pendingReportsCount },
    { id: 'announcements', label: 'Broadcasts', icon: <Megaphone className="w-4 h-4" />, badge: announcementsList.length },
    { id: 'categories', label: 'Categories', icon: <Tag className="w-4 h-4" />, badge: categories.length }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-16">
      {/* Toast Notification */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 lg-glass-dark text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-[#A8E635]/40 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#A8E635]" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Left Deep Forest Liquid Glass Sidebar */}
      <LiquidGlassSidebar
        brandTitle="FarmBridge Admin"
        sectionTitle="GOVERNANCE HUB"
        items={sidebarItems}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as AdminTabId)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        layoutNamespace="admin-sidebar"
        userSummary={{
          name: adminUser?.name || 'Administrator',
          subtitle: 'Platform Governance',
          avatar: adminUser?.avatar
        }}
        footerAction={{
          label: 'Edit Avatar',
          icon: <Camera className="w-4 h-4 text-[#A8E635]" />,
          onClick: handleOpenAdminAvatarModal,
          id: 'admin-sidebar-avatar-btn'
        }}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Top Translucent Control Bar */}
        <LiquidGlassCard variant="light" className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-[#062B1F] text-[#A8E635] cursor-pointer"
                aria-label="Open admin navigation"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <Database className="w-4 h-4 text-[#145A38] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#062B1F] truncate">
                    {isLiveConnected ? 'Live Cloud Firestore Stream' : 'Sync Reconnecting'}
                    {lastSyncTime ? ` · Updated ${lastSyncTime}` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {totalSignups === 0 && (
                <LiquidGlassButton
                  type="button"
                  variant="light"
                  size="xs"
                  onClick={handleSeedDefaultUsersToFirebase}
                  disabled={isSeedingUsers}
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>{isSeedingUsers ? 'Seeding...' : 'Populate Verified Users'}</span>
                </LiquidGlassButton>
              )}

              <LiquidGlassButton
                type="button"
                variant="light"
                size="xs"
                onClick={handleManualSync}
                disabled={isManualSyncing}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#145A38] ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span>{isManualSyncing ? 'Syncing...' : 'Force Sync'}</span>
              </LiquidGlassButton>

              <LiquidGlassButton
                id="admin-nav-advertisers-btn"
                type="button"
                variant="lime"
                size="xs"
                onClick={() => setActiveTab('advertisers')}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Advertisers {pendingAdsCount > 0 ? `(${pendingAdsCount})` : ''}</span>
              </LiquidGlassButton>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Sunrise Panorama Executive Banner + Frosted KPI Strip */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/35">
          <img
            src={heroFarmlandSunrise}
            alt="Agricultural overview landscape"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-br from-[#062B1F]/92 via-[#0B3D2B]/84 to-[#145A38]/76" />

          <div className="relative z-10 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={
                      adminUser?.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
                    }
                    alt={adminUser?.name || 'Admin'}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#A8E635] shadow-lg"
                  />
                  <button
                    id="admin-avatar-overlay-btn"
                    type="button"
                    onClick={handleOpenAdminAvatarModal}
                    className="absolute inset-0 bg-black/45 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Edit Admin Profile Picture"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A8E635]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Platform Administration &amp; Governance</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    FarmBridge Executive Controls
                  </h1>
                  <p className="text-xs text-[#DFF4E4]/85">
                    Signed in as <strong>{adminUser?.name || 'Administrator'}</strong> · Live Firebase analytics, ad governance, and official broadcasts.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <LiquidGlassButton
                  id="admin-edit-avatar-btn"
                  type="button"
                  variant="glass"
                  size="xs"
                  onClick={handleOpenAdminAvatarModal}
                >
                  <Camera className="w-3.5 h-3.5 text-[#A8E635]" />
                  <span>Edit Picture</span>
                </LiquidGlassButton>
                <LiquidGlassButton
                  type="button"
                  variant="lime"
                  size="xs"
                  onClick={() => setActiveTab('announcements')}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Broadcast Update</span>
                </LiquidGlassButton>
              </div>
            </div>

            {/* Frosted Glass Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="lg-glass-frosted rounded-2xl p-4 text-white tabular-nums">
                <div className="text-[11px] font-semibold text-[#DFF4E4]/80">Total Signups</div>
                <div className="text-2xl font-black text-white mt-1">{totalSignups}</div>
                <div className="text-[11px] text-[#A8E635] font-semibold mt-0.5">
                  +{signupsToday} today · +{signupsThisWeek} wk
                </div>
              </div>

              <div className="lg-glass-frosted rounded-2xl p-4 text-white tabular-nums">
                <div className="text-[11px] font-semibold text-[#DFF4E4]/80">Producers</div>
                <div className="text-2xl font-black text-white mt-1">{farmersCount}</div>
                <div className="text-[11px] text-[#DFF4E4]/70 mt-0.5">Farmers &amp; Suppliers</div>
              </div>

              <div className="lg-glass-frosted rounded-2xl p-4 text-white tabular-nums">
                <div className="text-[11px] font-semibold text-[#DFF4E4]/80">Buyers</div>
                <div className="text-2xl font-black text-white mt-1">{buyersCount}</div>
                <div className="text-[11px] text-[#DFF4E4]/70 mt-0.5">Active Accounts</div>
              </div>

              <div className="lg-glass-frosted rounded-2xl p-4 text-white tabular-nums">
                <div className="text-[11px] font-semibold text-[#DFF4E4]/80">Ad Requests</div>
                <div className="text-2xl font-black text-[#F4D35E] mt-1">{adRequests.length}</div>
                <div className="text-[11px] text-[#DFF4E4]/75 mt-0.5">{pendingAdsCount} pending</div>
              </div>

              <div className="lg-glass-frosted rounded-2xl p-4 text-white tabular-nums">
                <div className="text-[11px] font-semibold text-[#DFF4E4]/80">Products</div>
                <div className="text-2xl font-black text-white mt-1">{products.length}</div>
                <div className="text-[11px] text-[#DFF4E4]/70 mt-0.5">Listed Produce</div>
              </div>

              <div className="lg-glass-frosted rounded-2xl p-4 text-white tabular-nums">
                <div className="text-[11px] font-semibold text-[#DFF4E4]/80">Reports</div>
                <div className="text-2xl font-black text-rose-300 mt-1">{pendingReportsCount}</div>
                <div className="text-[11px] text-[#DFF4E4]/70 mt-0.5">Needs Review</div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LiquidGlassCard variant="light" className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-[#062B1F] text-base">Firebase User Signups Timeline</h3>
                    <p className="text-xs text-[#0B3D2B]/70">Live breakdown of farmer vs buyer registrations</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#062B1F]">
                    <span>Farmers</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#145A38]">Buyers</span>
                  </div>
                </div>
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={signupStats?.signupsByMonth || stats?.volumeChart || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(6,43,31,0.08)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#0B3D2B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#0B3D2B' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#062B1F', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="farmers" fill="#145A38" name="Farmers" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="buyers" fill="#A8E635" name="Buyers" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </LiquidGlassCard>

              <LiquidGlassCard variant="light" className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-[#062B1F] text-base">Marketplace Transaction Volume ($)</h3>
                    <p className="text-xs text-[#0B3D2B]/70">Gross transaction turnover through farm-gate sales</p>
                  </div>
                  <span className="text-xs font-bold text-[#062B1F] bg-[#DFF4E4] px-3 py-1 rounded-full border border-[#145A38]/20 tabular-nums">
                    GMV: ${Number(stats?.totalVolume || 0).toFixed(2)}
                  </span>
                </div>
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats?.volumeChart || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(6,43,31,0.08)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#0B3D2B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#0B3D2B' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#062B1F', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '12px' }}
                        formatter={(val: number) => [`$${val}`, 'Gross Sales']}
                      />
                      <Line type="monotone" dataKey="volume" stroke="#145A38" strokeWidth={3} dot={{ r: 4, fill: '#A8E635', stroke: '#062B1F' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </LiquidGlassCard>
            </div>

            <LiquidGlassCard variant="light" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#145A38]" />
                  <h3 className="font-extrabold text-[#062B1F] text-base">Live Real-Time Signups Stream</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className="text-xs font-bold text-[#145A38] hover:text-[#062B1F] flex items-center gap-1 cursor-pointer tabular-nums"
                >
                  <span>View all ({users.length})</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#062B1F]/15 rounded-2xl p-6 space-y-3">
                  <Users className="w-10 h-10 text-[#145A38]/40 mx-auto" />
                  <div className="text-sm font-bold text-[#062B1F]">No registered signups recorded yet in Firestore</div>
                  <p className="text-xs text-[#0B3D2B]/70 max-w-md mx-auto">
                    New registrations via the Login/Signup modal will appear here instantly in real-time.
                  </p>
                  <LiquidGlassButton
                    type="button"
                    variant="emerald"
                    size="sm"
                    onClick={handleSeedDefaultUsersToFirebase}
                    disabled={isSeedingUsers}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isSeedingUsers ? 'Seeding...' : 'Populate Verified Accounts'}</span>
                  </LiquidGlassButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.slice(0, 6).map(u => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-2xl border border-white/80 bg-white/70 flex items-start gap-3 hover:bg-white/90 transition-colors"
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover bg-[#DFF4E4] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="font-bold text-[#062B1F] text-xs truncate">{u.name}</div>
                          <span className="px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase bg-[#DFF4E4] text-[#062B1F]">
                            {u.role === 'fodder_supplier' ? 'Fodder Supplier' : u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#0B3D2B]/70 truncate">{u.email}</div>
                        {u.farmerProfile?.farmName && (
                          <div className="text-[10px] font-semibold text-[#145A38] truncate mt-0.5">
                            {u.farmerProfile.farmName}
                          </div>
                        )}
                        <div className="text-[10px] text-[#0B3D2B]/55 mt-1 flex items-center justify-between">
                          <span>{u.location?.city || 'Harare'}</span>
                          <span className="tabular-nums">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </LiquidGlassCard>
          </div>
        )}

        {/* TAB: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <LiquidGlassCard variant="light" className="p-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex-1 w-full relative">
                  <Search className="w-4 h-4 text-[#0B3D2B]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search registered users by name, email, farm, phone, city..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/85 border border-[#062B1F]/12 text-xs text-[#062B1F] focus:outline-hidden focus:ring-2 focus:ring-[#145A38]/25"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <div className="flex items-center bg-white/65 p-1 rounded-xl text-xs overflow-x-auto border border-white/80">
                    {(['all', 'farmer', 'fodder_supplier', 'buyer', 'admin'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setUserRoleFilter(role)}
                        className={`px-3 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                          userRoleFilter === role
                            ? 'bg-[#062B1F] text-[#A8E635] shadow-xs'
                            : 'text-[#0B3D2B]/75 hover:text-[#062B1F]'
                        }`}
                      >
                        {role === 'all' ? 'All Roles' : role === 'fodder_supplier' ? 'Fodder Supplier' : role}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center bg-white/65 p-1 rounded-xl text-xs border border-white/80">
                    {(['all', 'active', 'suspended'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setUserStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                          userStatusFilter === st
                            ? 'bg-[#145A38] text-white shadow-xs'
                            : 'text-[#0B3D2B]/75 hover:text-[#062B1F]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center bg-white/65 p-1 rounded-xl text-xs border border-white/80">
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: 'today', label: 'Today (24h)' },
                      { id: 'week', label: 'This Week' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setUserTimeFilter(t.id as any)}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          userTimeFilter === t.id
                            ? 'bg-[#062B1F] text-[#A8E635] shadow-xs'
                            : 'text-[#0B3D2B]/75 hover:text-[#062B1F]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard variant="light" className="overflow-hidden p-0">
              <div className="p-4 border-b border-[#062B1F]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#145A38]" />
                  <h3 className="font-extrabold text-[#062B1F] text-sm tabular-nums">
                    Registered Accounts ({filteredUsers.length})
                  </h3>
                </div>
                <span className="text-xs text-[#0B3D2B]/65 font-medium">
                  Live stream updating from Firestore
                </span>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 p-6 space-y-3">
                  <Users className="w-12 h-12 text-[#145A38]/35 mx-auto" />
                  <h4 className="font-bold text-[#062B1F] text-base">No matching signups found</h4>
                  <p className="text-xs text-[#0B3D2B]/65 max-w-sm mx-auto">
                    {users.length === 0
                      ? 'No user documents currently exist in Firestore collection "users".'
                      : 'Try clearing your search query or adjusting role/date filters.'}
                  </p>
                  {users.length === 0 && (
                    <LiquidGlassButton
                      type="button"
                      variant="emerald"
                      size="sm"
                      onClick={handleSeedDefaultUsersToFirebase}
                      disabled={isSeedingUsers}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{isSeedingUsers ? 'Seeding...' : 'Populate Verified Producers'}</span>
                    </LiquidGlassButton>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/55 text-[#0B3D2B]/70 font-bold uppercase tracking-wider border-b border-[#062B1F]/10">
                      <tr>
                        <th className="px-4 py-3">User &amp; Identity</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Location &amp; Farm</th>
                        <th className="px-4 py-3">Signed Up</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#062B1F]/8">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white/55 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatar}
                                alt={u.name}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full object-cover bg-[#DFF4E4] shrink-0"
                              />
                              <div>
                                <div className="font-bold text-[#062B1F]">{u.name}</div>
                                <div className="text-[11px] text-[#0B3D2B]/65">{u.email}</div>
                                {u.phone && <div className="text-[10px] text-[#0B3D2B]/55 tabular-nums">{u.phone}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-[#DFF4E4] text-[#062B1F]">
                              {u.role === 'fodder_supplier' ? 'Fodder Supplier' : u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#0B3D2B]">
                            <div className="font-semibold text-[#062B1F]">
                              {u.location?.city || 'Harare'}, {u.location?.province || 'Harare'}
                            </div>
                            {u.farmerProfile?.farmName && (
                              <div className="text-[11px] text-[#145A38] font-medium">
                                {u.farmerProfile.farmName}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#0B3D2B]/70 tabular-nums">
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Recent'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'active'
                                  ? 'bg-[#DFF4E4] text-[#145A38]'
                                  : 'bg-rose-500/15 text-rose-800'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u.id, u.status, u.email)}
                                className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                                  u.status === 'active'
                                    ? 'bg-white border border-[#062B1F]/15 hover:bg-white/90 text-[#062B1F]'
                                    : 'bg-[#145A38] hover:bg-[#0B3D2B] text-white'
                                }`}
                              >
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                              {u.id !== adminUser?.id ? (
                                <button
                                  id={`admin-delete-user-${u.id}`}
                                  type="button"
                                  onClick={() => handleOpenDeleteUserModal(u)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs bg-rose-500/10 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-500/25 hover:border-rose-600 transition-colors cursor-pointer"
                                  title={`Permanently delete ${u.name}'s account`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded-xl text-[10px] font-semibold bg-[#062B1F] text-[#A8E635]">
                                  Current Admin
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </LiquidGlassCard>
          </div>
        )}

        {/* TAB: ADVERTISERS */}
        {activeTab === 'advertisers' && (
          <div className="space-y-6">
            <LiquidGlassCard variant="light" className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-600 fill-amber-500" />
                    <h2 className="text-lg font-extrabold text-[#062B1F]">
                      Farmer Advertisement Requests &amp; POP Approvals
                    </h2>
                  </div>
                  <p className="text-xs text-[#0B3D2B]/70 mt-0.5">
                    Review farmer Hot Deals submissions, verify Proof of Payments (POP), and approve or decline $1/day promotions.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'active', label: 'Active' },
                    { id: 'expired', label: 'Expired' },
                    { id: 'rejected', label: 'Rejected' }
                  ].map(pill => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setAdStatusFilter(pill.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        adStatusFilter === pill.id
                          ? 'bg-[#062B1F] text-[#A8E635] shadow-xs'
                          : 'bg-white/75 text-[#0B3D2B]/75 hover:bg-white'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>
            </LiquidGlassCard>

            {filteredAds.length === 0 ? (
              <LiquidGlassCard variant="light" className="text-center py-16 p-6 space-y-3">
                <Flame className="w-12 h-12 text-[#145A38]/35 mx-auto" />
                <h3 className="font-bold text-[#062B1F] text-base">No advertisement requests found</h3>
                <p className="text-xs text-[#0B3D2B]/65 max-w-sm mx-auto">
                  {adStatusFilter === 'all'
                    ? 'No farmers have submitted ad requests yet. Farmers can request ads at $1/day from their dashboard.'
                    : `No requests match the "${adStatusFilter}" filter.`}
                </p>
              </LiquidGlassCard>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredAds.map(ad => {
                  const lifecycle = getAdLifecycle(ad, nowMs);
                  const badge = getAdStatusBadgeMeta(lifecycle.effectiveStatus);
                  const feeVal = Number(ad.totalFee ?? ad.totalAmount ?? (lifecycle.durationDays * 1.0));
                  const daysVal = lifecycle.durationDays;

                  return (
                    <LiquidGlassCard key={ad.id} variant="light" className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#062B1F]/10 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#F4D35E]/30 text-[#694800] flex items-center justify-center shrink-0">
                            <Flame className="w-5 h-5 fill-amber-500 text-amber-700" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-extrabold text-[#062B1F] text-base">{ad.dealHeadline}</h3>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div className="text-xs text-[#0B3D2B]/70 mt-0.5">
                              Farmer: <strong>{ad.farmerName}</strong> ({ad.farmName}) · {ad.farmerPhone || 'No phone'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right tabular-nums">
                          <div>
                            <div className="text-xs text-[#0B3D2B]/60">Campaign Fee</div>
                            <div className="text-base font-black text-[#145A38]">${feeVal.toFixed(2)}</div>
                          </div>
                          <div className="text-xs text-[#0B3D2B]/60">
                            <div>Duration</div>
                            <div className="font-bold text-[#062B1F]">{daysVal} Days ($1/day)</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 bg-white/65 px-4 py-2.5 rounded-2xl border border-white/80 text-xs tabular-nums">
                        <div>
                          <span className="text-[#0B3D2B]/60 font-semibold block text-[11px]">Start Date</span>
                          <span className="font-bold text-[#062B1F]">{formatAdDate(lifecycle.startDateIso)}</span>
                        </div>
                        <div>
                          <span className="text-[#0B3D2B]/60 font-semibold block text-[11px]">Expiry Date</span>
                          <span className="font-bold text-[#062B1F]">{formatAdDate(lifecycle.endDateIso)}</span>
                        </div>
                        <div>
                          <span className="text-[#0B3D2B]/60 font-semibold block text-[11px]">Remaining Duration</span>
                          <span className="font-bold text-[#145A38]">{lifecycle.remainingLabel}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="bg-white/65 p-3.5 rounded-2xl border border-white/80 space-y-1">
                          <div className="text-[#0B3D2B]/60 font-semibold text-[11px]">Product &amp; Discount</div>
                          <div className="font-bold text-[#062B1F] text-sm">{ad.productName}</div>
                          <div className="text-amber-700 font-bold">Offer: {ad.discountText}</div>
                          <div className="text-[#0B3D2B]/70 mt-1 line-clamp-2">{ad.dealDescription}</div>
                        </div>

                        <div className="bg-white/65 p-3.5 rounded-2xl border border-white/80 space-y-1">
                          <div className="text-[#0B3D2B]/60 font-semibold text-[11px]">Payment Verification</div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase text-[#062B1F]">{ad.paymentMethod}</span>
                            {ad.paymentReference && (
                              <span className="font-mono text-[#0B3D2B]/65">Ref: {ad.paymentReference}</span>
                            )}
                          </div>
                          {ad.proofOfPaymentUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingPopAd(ad)}
                              className="mt-2 text-xs font-bold text-[#145A38] hover:text-[#062B1F] underline flex items-center gap-1 cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>View Attached POP Receipt</span>
                            </button>
                          ) : (
                            <div className="text-amber-700 font-medium mt-1">No proof of payment uploaded</div>
                          )}
                        </div>

                        <div className="bg-white/65 p-3.5 rounded-2xl border border-white/80 space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="text-[#0B3D2B]/60 font-semibold text-[11px]">Admin Decision Notes</div>
                            <input
                              type="text"
                              placeholder="Add reason or note for farmer..."
                              defaultValue={ad.adminNotes || ''}
                              onChange={e => setAdminNotesInput({ ...adminNotesInput, [ad.id]: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-[#062B1F]/15 rounded-xl mt-1 text-[#062B1F] focus:outline-hidden focus:ring-1 focus:ring-[#145A38]"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {lifecycle.effectiveStatus !== 'active' && lifecycle.effectiveStatus !== 'approved' && (
                              <LiquidGlassButton
                                type="button"
                                variant="emerald"
                                size="xs"
                                onClick={() => handleUpdateAdStatus(ad.id, 'approved')}
                                disabled={updatingAdId === ad.id}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Ad</span>
                              </LiquidGlassButton>
                            )}

                            {(lifecycle.effectiveStatus === 'active' || lifecycle.effectiveStatus === 'approved') && (
                              <LiquidGlassButton
                                type="button"
                                variant="light"
                                size="xs"
                                onClick={() => handleUpdateAdStatus(ad.id, 'expired')}
                                disabled={updatingAdId === ad.id}
                              >
                                Mark Expired
                              </LiquidGlassButton>
                            )}

                            {lifecycle.effectiveStatus !== 'rejected' && (
                              <LiquidGlassButton
                                type="button"
                                variant="danger"
                                size="xs"
                                onClick={() => handleUpdateAdStatus(ad.id, 'rejected')}
                                disabled={updatingAdId === ad.id}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </LiquidGlassButton>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteAd(ad.id)}
                              disabled={updatingAdId === ad.id}
                              className="p-1.5 text-[#0B3D2B]/45 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer ml-auto"
                              title="Delete Ad Request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </LiquidGlassCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: PRODUCTS */}
        {activeTab === 'products' && (
          <LiquidGlassCard variant="light" className="overflow-hidden p-0">
            <div className="p-4 border-b border-[#062B1F]/10 flex items-center justify-between">
              <h3 className="font-extrabold text-[#062B1F] text-sm tabular-nums">
                Active Product Listings ({products.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/55 text-[#0B3D2B]/70 font-bold uppercase tracking-wider border-b border-[#062B1F]/10">
                  <tr>
                    <th className="px-4 py-3">Listing</th>
                    <th className="px-4 py-3">Producer</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#062B1F]/8">
                  {products.map(prod => (
                    <tr key={prod.id} className="hover:bg-white/55">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-cover bg-[#DFF4E4]"
                          />
                          <div>
                            <div className="font-bold text-[#062B1F]">{prod.name}</div>
                            <div className="text-[11px] text-[#0B3D2B]/60">{prod.categoryName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#0B3D2B] font-medium">
                        {prod.farmerName} ({prod.farmName})
                      </td>
                      <td className="px-4 py-3 font-bold text-[#145A38] tabular-nums">
                        ${prod.price.toFixed(2)} / {prod.unit}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                            prod.availability === 'available'
                              ? 'bg-[#DFF4E4] text-[#145A38]'
                              : 'bg-[#F4D35E]/35 text-[#694800]'
                          }`}
                        >
                          {prod.quantityAvailable} {prod.unit}s
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pendingDeleteProductId === prod.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="px-2 py-1 rounded-md bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteProductId(null)}
                              className="px-2 py-1 rounded-md bg-white border border-[#062B1F]/15 text-[#062B1F] text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteProductId(prod.id)}
                            className="p-1.5 text-[#0B3D2B]/45 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </LiquidGlassCard>
        )}

        {/* TAB: REPORTS */}
        {activeTab === 'reports' && (
          <LiquidGlassCard variant="light" className="overflow-hidden p-0">
            <div className="p-4 border-b border-[#062B1F]/10 flex items-center justify-between">
              <h3 className="font-extrabold text-[#062B1F] text-sm">Marketplace Incident &amp; Content Reports</h3>
            </div>
            <div className="divide-y divide-[#062B1F]/10">
              {reports.length === 0 ? (
                <div className="p-10 text-center text-xs text-[#0B3D2B]/65">No reports filed.</div>
              ) : (
                reports.map(rep => (
                  <div key={rep.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#062B1F]">{rep.reason.toUpperCase()}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rep.status === 'pending'
                              ? 'bg-rose-500/15 text-rose-800'
                              : 'bg-[#DFF4E4] text-[#145A38]'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-[#0B3D2B]/80">{rep.description}</p>
                    </div>
                    {rep.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <LiquidGlassButton
                          type="button"
                          variant="emerald"
                          size="xs"
                          onClick={() => handleResolveReport(rep.id, 'resolved')}
                        >
                          Resolve
                        </LiquidGlassButton>
                        <LiquidGlassButton
                          type="button"
                          variant="light"
                          size="xs"
                          onClick={() => handleResolveReport(rep.id, 'dismissed')}
                        >
                          Dismiss
                        </LiquidGlassButton>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </LiquidGlassCard>
        )}

        {/* TAB: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiquidGlassCard variant="light" className="p-6 space-y-4">
              <h3 className="font-extrabold text-[#062B1F] text-base">Broadcast Platform Announcement</h3>
              {annSuccess && (
                <div className="p-3 bg-[#DFF4E4] border border-[#145A38]/25 text-[#062B1F] rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#145A38]" />
                  <span>Broadcast successfully published.</span>
                </div>
              )}
              {annError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{annError}</span>
                </div>
              )}
              <form onSubmit={handleSendAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#062B1F]">Headline</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={e => setAnnTitle(e.target.value)}
                    placeholder="e.g. Harare Regional Logistics Update"
                    className="w-full mt-1 p-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-xs text-[#062B1F] focus:ring-2 focus:ring-[#145A38]/25 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#062B1F]">Target Group</label>
                    <select
                      value={annTarget}
                      onChange={e => setAnnTarget(e.target.value as any)}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-xs text-[#062B1F] focus:ring-2 focus:ring-[#145A38]/25 focus:outline-hidden"
                    >
                      <option value="all">Everyone</option>
                      <option value="farmers">Farmers &amp; Producers</option>
                      <option value="buyers">Buyers &amp; Wholesalers</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[#062B1F]">Urgency Level</label>
                    <select
                      value={annPriority}
                      onChange={e => setAnnPriority(e.target.value as any)}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-xs text-[#062B1F] focus:ring-2 focus:ring-[#145A38]/25 focus:outline-hidden"
                    >
                      <option value="normal">Normal Priority</option>
                      <option value="urgent">Urgent / Alert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#062B1F]">Announcement Body</label>
                  <textarea
                    rows={4}
                    value={annContent}
                    onChange={e => setAnnContent(e.target.value)}
                    placeholder="Detailed broadcast content for stakeholders..."
                    className="w-full mt-1 p-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-xs text-[#062B1F] focus:ring-2 focus:ring-[#145A38]/25 focus:outline-hidden"
                  />
                </div>

                <LiquidGlassButton
                  type="submit"
                  variant="emerald"
                  size="sm"
                  disabled={isPublishingAnn}
                  className="w-full"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPublishingAnn ? 'Broadcasting...' : 'Publish Official Broadcast'}</span>
                </LiquidGlassButton>
              </form>
            </LiquidGlassCard>

            <LiquidGlassCard variant="light" className="p-6 space-y-4">
              <h3 className="font-extrabold text-[#062B1F] text-base tabular-nums">
                Past Platform Broadcasts ({announcementsList.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {announcementsList.map(ann => (
                  <div
                    key={ann.id}
                    className="p-3.5 rounded-2xl border border-white/80 bg-white/65 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#062B1F]">{ann.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ann.priority === 'urgent'
                              ? 'bg-rose-500/15 text-rose-800'
                              : 'bg-[#DFF4E4] text-[#145A38]'
                          }`}
                        >
                          {ann.priority}
                        </span>
                        {pendingDeleteAnnId === ann.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteAnnId(null)}
                              className="px-2 py-0.5 rounded bg-white border border-[#062B1F]/15 text-[#062B1F] text-[10px] font-bold cursor-pointer"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteAnnId(ann.id)}
                            className="text-[#0B3D2B]/45 hover:text-rose-600 p-1 rounded-md hover:bg-rose-500/10 cursor-pointer"
                            title="Delete broadcast"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[#0B3D2B]/80 line-clamp-2">{ann.content}</p>
                    <div className="flex items-center justify-between text-[10px] text-[#0B3D2B]/55 pt-1 border-t border-[#062B1F]/10 tabular-nums">
                      <span>Target: {ann.targetAudience}</span>
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </LiquidGlassCard>
          </div>
        )}

        {/* TAB: CATEGORIES */}
        {activeTab === 'categories' && (
          <LiquidGlassCard variant="light" className="p-6 space-y-4">
            <h3 className="font-extrabold text-[#062B1F] text-base">Agricultural Catalog Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl border border-white/80 bg-white/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#062B1F]">{cat.name}</div>
                    <div className="text-[11px] text-[#0B3D2B]/60">{cat.slug}</div>
                  </div>
                  <Tag className="w-4 h-4 text-[#145A38]" />
                </div>
              ))}
            </div>
          </LiquidGlassCard>
        )}
      </div>

      {/* POP Full-Screen Inspection Modal */}
      <LiquidGlassModal
        isOpen={Boolean(viewingPopAd)}
        onClose={() => setViewingPopAd(null)}
        title={viewingPopAd ? `Proof of Payment: ${viewingPopAd.farmerName}` : 'Proof of Payment'}
        subtitle={viewingPopAd?.dealHeadline}
        icon={<Receipt className="w-5 h-5 text-[#A8E635]" />}
        maxWidthClass="max-w-2xl"
      >
        {viewingPopAd && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-white/75 p-3.5 rounded-2xl border border-[#062B1F]/12 tabular-nums">
              <div><strong>Deal Headline:</strong> {viewingPopAd.dealHeadline}</div>
              <div><strong>Method:</strong> {viewingPopAd.paymentMethod.toUpperCase()}</div>
              <div><strong>Duration:</strong> {viewingPopAd.durationDays ?? viewingPopAd.days ?? 7} Days @ $1/day</div>
              <div><strong>Amount Due:</strong> <span className="font-bold text-[#145A38]">${Number(viewingPopAd.totalFee ?? viewingPopAd.totalAmount ?? 7).toFixed(2)}</span></div>
              <div><strong>Ref ID:</strong> {viewingPopAd.paymentReference || 'N/A'}</div>
              <div><strong>Status:</strong> <span className="uppercase font-bold text-amber-700">{viewingPopAd.status}</span></div>
            </div>

            <div className="max-h-96 overflow-auto rounded-2xl border border-[#062B1F]/15 bg-[#062B1F] flex items-center justify-center p-2">
              {viewingPopAd.proofOfPaymentUrl?.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingPopAd.proofOfPaymentUrl}
                  title="Proof of Payment PDF"
                  className="w-full h-80 rounded-xl bg-white"
                />
              ) : (
                <img
                  src={viewingPopAd.proofOfPaymentUrl}
                  alt="Proof of Payment"
                  className="max-h-80 w-auto rounded-xl object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <LiquidGlassButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleUpdateAdStatus(viewingPopAd.id, 'rejected')}
              >
                Decline POP
              </LiquidGlassButton>
              <LiquidGlassButton
                type="button"
                variant="emerald"
                size="sm"
                onClick={() => handleUpdateAdStatus(viewingPopAd.id, 'approved')}
              >
                <Check className="w-4 h-4" />
                <span>Approve &amp; Launch Hot Deal</span>
              </LiquidGlassButton>
            </div>
          </div>
        )}
      </LiquidGlassModal>

      {/* Admin Profile Picture Edit Modal */}
      <LiquidGlassModal
        id="admin-avatar-modal-dialog"
        isOpen={showAdminAvatarModal}
        onClose={() => setShowAdminAvatarModal(false)}
        title="Edit Admin Profile Picture"
        subtitle="Shown on navbar and official broadcasts"
        icon={<Camera className="w-5 h-5 text-[#A8E635]" />}
        maxWidthClass="max-w-md"
      >
        <div className="p-6 space-y-4">
          {avatarError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{avatarError}</span>
            </div>
          )}

          <form onSubmit={handleSaveAdminAvatar} className="space-y-4 text-xs">
            <div className="flex items-center gap-4 bg-white/75 p-4 rounded-2xl border border-[#062B1F]/12">
              <img
                src={adminAvatarDraft}
                alt="Admin Avatar Preview"
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#145A38] shadow-sm bg-white shrink-0"
              />
              <div className="flex-1 space-y-2">
                <label className="font-bold text-[#062B1F] block">Upload Photo (400×400px)</label>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#DFF4E4]/60 border border-[#062B1F]/15 rounded-xl font-bold text-[#062B1F] cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Choose Image File</span>
                  <input
                    id="admin-avatar-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAdminAvatarFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">Or Paste Image URL</label>
              <input
                id="admin-avatar-url-input"
                type="text"
                value={adminAvatarDraft}
                onChange={e => setAdminAvatarDraft(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-hidden focus:ring-2 focus:ring-[#145A38]/25"
              />
            </div>

            <div>
              <label className="font-bold text-[#0B3D2B]/65 uppercase text-[10px] tracking-wider block mb-1.5">
                Executive Presets
              </label>
              <div className="flex items-center gap-2">
                {ADMIN_PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAdminAvatarDraft(preset.url)}
                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      adminAvatarDraft === preset.url
                        ? 'border-[#145A38] scale-105 shadow-xs'
                        : 'border-white opacity-75 hover:opacity-100'
                    }`}
                    title={preset.label}
                  >
                    <img src={preset.url} alt={preset.label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#062B1F]/10">
              <LiquidGlassButton
                type="button"
                variant="light"
                size="sm"
                onClick={() => setShowAdminAvatarModal(false)}
              >
                Cancel
              </LiquidGlassButton>
              <LiquidGlassButton
                id="save-admin-avatar-btn"
                type="submit"
                variant="emerald"
                size="sm"
                disabled={isSavingAvatar}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSavingAvatar ? 'Saving...' : 'Save Picture'}</span>
              </LiquidGlassButton>
            </div>
          </form>
        </div>
      </LiquidGlassModal>

      {/* Delete User Account Confirmation Modal */}
      <LiquidGlassModal
        id="admin-delete-user-modal"
        isOpen={Boolean(pendingDeleteUser)}
        onClose={() => !deletingUserId && setPendingDeleteUser(null)}
        title="Delete User Account"
        subtitle="Permanent Firebase & marketplace removal"
        icon={<AlertTriangle className="w-5 h-5 text-rose-300" />}
        maxWidthClass="max-w-md"
      >
        {pendingDeleteUser && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/75 border border-[#062B1F]/12">
              <img
                src={pendingDeleteUser.avatar}
                alt={pendingDeleteUser.name}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover bg-[#DFF4E4] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[#062B1F] text-xs truncate">{pendingDeleteUser.name}</div>
                <div className="text-[11px] text-[#0B3D2B]/70 truncate">{pendingDeleteUser.email}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold uppercase text-[#062B1F] bg-[#DFF4E4] px-2 py-0.5 rounded-full">
                    {pendingDeleteUser.role === 'fodder_supplier' ? 'Fodder Supplier' : pendingDeleteUser.role}
                  </span>
                  {pendingDeleteUser.farmerProfile?.farmName && (
                    <span className="text-[10px] text-[#145A38] font-medium truncate">
                      {pendingDeleteUser.farmerProfile.farmName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-950 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>This action cannot be undone</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] text-rose-900 space-y-0.5">
                <li>Deletes the user profile from Firebase Firestore and the marketplace directory.</li>
                <li>Removes all products, community media posts, ad requests, buyer requests, and notifications created by this account.</li>
                <li>Anonymizes historical order records and blocks this account from signing back in.</li>
              </ul>
            </div>

            {deleteUserError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Deletion blocked</span>
                </div>
                <p className="text-[11px]">{deleteUserError}</p>
                {deleteBlockingOrders.length > 0 && (
                  <p className="text-[11px] font-semibold">
                    Open orders: {deleteBlockingOrders.join(', ')}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleConfirmDeleteUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#062B1F] block mb-1">Removal Reason (Audit Log)</label>
                <input
                  id="admin-delete-reason-input"
                  type="text"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="e.g. Spam / fake listings"
                  className="w-full px-3 py-2 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-hidden focus:ring-2 focus:ring-rose-500/25"
                />
              </div>

              {isSellerRole(pendingDeleteUser.role) && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F4D35E]/20 border border-[#F4D35E]/60 text-[#062B1F] cursor-pointer">
                  <input
                    id="admin-force-delete-checkbox"
                    type="checkbox"
                    checked={deleteForceConfirm}
                    onChange={e => setDeleteForceConfirm(e.target.checked)}
                    className="mt-0.5 accent-rose-600 cursor-pointer"
                  />
                  <span className="text-[11px] leading-snug">
                    <strong className="block font-bold">Force delete spam seller account</strong>
                    Cancel any open or unverified orders from this seller automatically (preserving anonymized order records) and purge immediately.
                  </span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#062B1F]/10">
                <LiquidGlassButton
                  type="button"
                  variant="light"
                  size="sm"
                  disabled={Boolean(deletingUserId)}
                  onClick={() => setPendingDeleteUser(null)}
                >
                  Cancel
                </LiquidGlassButton>
                <LiquidGlassButton
                  id="confirm-admin-delete-user-btn"
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={Boolean(deletingUserId)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingUserId ? 'Deleting & Syncing...' : 'Permanently Delete Account'}</span>
                </LiquidGlassButton>
              </div>
            </form>
          </div>
        )}
      </LiquidGlassModal>
    </div>
  );
};
