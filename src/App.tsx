import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { mobileService } from './services/mobileService';
import { LiquidGlassDefs, LiquidGlassModal, LiquidGlassButton } from './components/glass';
import { Navbar } from './components/Navbar';
import { AnnouncementsBanner } from './components/AnnouncementsBanner';
import { CookieAccessBanner } from './components/CookieAccessBanner';
import { Marketplace } from './components/Marketplace';
import { FarmerDashboard } from './components/FarmerDashboard';
import { BuyerDashboard } from './components/BuyerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { OrderManagement } from './components/OrderManagement';
import { MessagingHub } from './components/MessagingHub';
import { FarmProfileView } from './components/FarmProfileView';
import { FavoritesView } from './components/FavoritesView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AddEditProductModal } from './components/AddEditProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ReviewModal } from './components/ReviewModal';
import { ReportModal } from './components/ReportModal';
import { AuthModal, AuthModalMode } from './components/AuthModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AdminAccessModal } from './components/AdminAccessModal';
import { FarmerProfileModal } from './components/FarmerProfileModal';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { AndroidDeviceShell } from './components/AndroidDeviceShell';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { Product, Order, User, AppNotification, MediaPost, BuyerRequest, isSellerRole } from './types';
import {
  Phone,
  Mail,
  MapPin,
  Lock,
  AlertTriangle,
  CheckCircle2,
  MailCheck,
  X
} from 'lucide-react';

const PROTECTED_VIEWS = new Set([
  'farmer_dashboard',
  'buyer_dashboard',
  'admin',
  'orders',
  'messages',
  'favorites'
]);

export function App() {
  const {
    user,
    loading: authLoading,
    requiresEmailVerification,
    checkEmailVerification,
    logout,
    suspensionNotice,
    clearSuspensionNotice,
    accountDeletionNotice,
    clearAccountDeletionNotice
  } = useAuth();
  const { openCart, isCheckoutOpen, closeCheckout } = useCart();

  // Navigation State with persistence across refreshes
  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('agrox_current_view') || 'marketplace';
      if (PROTECTED_VIEWS.has(saved)) {
        const hasSession =
          Boolean(localStorage.getItem('agrox_user')) ||
          Boolean(localStorage.getItem('fb_active_user'));
        return hasSession ? saved : 'marketplace';
      }
      return saved;
    } catch {
      return 'marketplace';
    }
  });
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const [chatRecipientUser, setChatRecipientUser] = useState<User | null>(null);
  const [chatProductId, setChatProductId] = useState<string | null>(null);
  const [chatProduct, setChatProduct] = useState<Product | null>(null);
  const [chatPost, setChatPost] = useState<MediaPost | null>(null);
  const [chatBuyerRequest, setChatBuyerRequest] = useState<BuyerRequest | null>(null);
  const [messagesChannel, setMessagesChannel] = useState<'direct' | 'announcements'>('direct');
  const [pendingChatProduct, setPendingChatProduct] = useState<Product | null>(null);
  const [pendingChatUser, setPendingChatUser] = useState<User | null>(null);
  const [pendingChatPost, setPendingChatPost] = useState<MediaPost | null>(null);
  const [farmerInitialTab, setFarmerInitialTab] = useState<'overview' | 'orders' | 'products' | 'posts' | 'requests' | 'advertising' | 'profile'>('overview');

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [confirmedOrders, setConfirmedOrders] = useState<Order[] | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reportProduct, setReportProduct] = useState<Product | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthModalMode>('login');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminAccessOpen, setIsAdminAccessOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isFarmerProfileOpen, setIsFarmerProfileOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isAndroidView, setIsAndroidView] = useState(false);
  const [marketplaceSearchQuery, setMarketplaceSearchQuery] = useState('');
  const [pendingScrollSection, setPendingScrollSection] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<'support' | 'privacy' | 'terms' | null>(null);

  const wasSignedInRef = useRef<boolean>(false);

  const clearProtectedSessionUi = () => {
    setSelectedProduct(null);
    setEditingProduct(null);
    setIsAddProductOpen(false);
    setConfirmedOrders(null);
    setReviewOrder(null);
    setReportProduct(null);
    setIsNotificationsOpen(false);
    setIsAdminAccessOpen(false);
    setIsFarmerProfileOpen(false);
    setIsUserSettingsOpen(false);
    setSelectedFarmerId(null);
    setSelectedOrderForTracking(null);
    setChatRecipientId(null);
    setChatRecipientUser(null);
    setChatProductId(null);
    setChatProduct(null);
    setChatPost(null);
    setChatBuyerRequest(null);
    setPendingChatProduct(null);
    setPendingChatPost(null);
    setPendingChatUser(null);
    setCurrentView('marketplace');
    try {
      localStorage.removeItem('agrox_current_view');
      sessionStorage.removeItem('agrox_current_view');
    } catch {}
  };

  // Enforce Sign-Out -> Login redirect + block protected views + gate unverified email accounts
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      wasSignedInRef.current = true;
      if (requiresEmailVerification) {
        if (PROTECTED_VIEWS.has(currentView)) {
          setCurrentView('marketplace');
          try {
            localStorage.setItem('agrox_current_view', 'marketplace');
            window.history.replaceState({ view: 'marketplace' }, '', '#marketplace');
          } catch {}
          setAuthMode('verify_email');
          setIsAuthOpen(true);
        }
        return;
      }
      if (window.location.hash === '#login' || window.location.hash === '#verified') {
        try {
          window.history.replaceState({ view: currentView }, '', `#${currentView}`);
        } catch {}
      }
      return;
    }

    const justSignedOut = wasSignedInRef.current;
    if (justSignedOut) {
      wasSignedInRef.current = false;
      clearProtectedSessionUi();
      try {
        window.history.replaceState({ view: 'marketplace', auth: 'login', loggedOut: true }, '', '#login');
      } catch {}
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }

    if (PROTECTED_VIEWS.has(currentView)) {
      clearProtectedSessionUi();
      try {
        window.history.replaceState({ view: 'marketplace', auth: 'login', loggedOut: true }, '', '#login');
      } catch {}
      setAuthMode('login');
      setIsAuthOpen(true);
    }
  }, [user, authLoading, requiresEmailVerification, currentView]);

  // Auto-check email verification when user returns from email link (#verified or window focus)
  useEffect(() => {
    if (!user || !requiresEmailVerification) return;

    const tryVerify = () => {
      checkEmailVerification()
        .then((res) => {
          if (res.verified && isAuthOpen && authMode === 'verify_email') {
            setIsAuthOpen(false);
          }
        })
        .catch(() => {});
    };

    if (window.location.hash === '#verified') {
      tryVerify();
    }

    window.addEventListener('focus', tryVerify);
    window.addEventListener('hashchange', tryVerify);
    return () => {
      window.removeEventListener('focus', tryVerify);
      window.removeEventListener('hashchange', tryVerify);
    };
  }, [user, requiresEmailVerification, isAuthOpen, authMode]);

  // Browser Back / Forward guard for protected views when unauthenticated
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const targetView =
        (event.state && typeof event.state.view === 'string' && event.state.view) ||
        window.location.hash.replace(/^#/, '') ||
        'marketplace';

      if (!user && !authLoading) {
        if (PROTECTED_VIEWS.has(targetView) || PROTECTED_VIEWS.has(currentView) || window.location.hash === '#login') {
          clearProtectedSessionUi();
          try {
            window.history.replaceState({ view: 'marketplace', auth: 'login', loggedOut: true }, '', '#login');
          } catch {}
          setAuthMode('login');
          setIsAuthOpen(true);
          return;
        }
      }

      if (targetView && targetView !== 'login' && (user || !PROTECTED_VIEWS.has(targetView))) {
        setCurrentView(targetView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, authLoading, currentView]);

  // Initialize native Capacitor mobile services (Splash Screen, Status Bar, Back Button)
  useEffect(() => {
    mobileService.initMobileApp();

    const backListener = mobileService.registerBackButton(() => {
      if (selectedProduct) { setSelectedProduct(null); return true; }
      if (isAddProductOpen) { setIsAddProductOpen(false); return true; }
      if (isCheckoutOpen) { closeCheckout(); return true; }
      if (reviewOrder) { setReviewOrder(null); return true; }
      if (reportProduct) { setReportProduct(null); return true; }
      if (isAuthOpen) { setIsAuthOpen(false); return true; }
      if (isNotificationsOpen) { setIsNotificationsOpen(false); return true; }
      if (isAdminAccessOpen) { setIsAdminAccessOpen(false); return true; }
      if (isInstallModalOpen) { setIsInstallModalOpen(false); return true; }

      if (currentView !== 'marketplace') {
        setCurrentView('marketplace');
        return true;
      }
      return false;
    });

    return () => {
      if (backListener && typeof (backListener as any).then === 'function') {
        (backListener as any).then((handle: any) => handle?.remove?.());
      }
    };
  }, [
    selectedProduct,
    isAddProductOpen,
    isCheckoutOpen,
    reviewOrder,
    reportProduct,
    isAuthOpen,
    isNotificationsOpen,
    isAdminAccessOpen,
    isInstallModalOpen,
    currentView
  ]);

  const openChatWithProduct = (prod: Product) => {
    const sellerFallback: User = {
      id: prod.farmerId,
      name: prod.farmerName || 'Farm Seller',
      email: '',
      phone: '',
      role: prod.sellerRole || (prod.category === 'cat-fodder' ? 'fodder_supplier' : 'farmer'),
      avatar: prod.farmerAvatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
      location: {
        country: 'Zimbabwe',
        province: prod.location?.province || 'Harare',
        city: prod.location?.city || 'Harare',
        community: prod.location?.community
      },
      status: 'active',
      createdAt: prod.createdAt || new Date().toISOString(),
      farmerProfile: {
        farmName: prod.farmName || `${prod.farmerName}'s Farm`,
        isVerified: true
      }
    };
    setChatRecipientId(prod.farmerId);
    setChatRecipientUser(sellerFallback);
    setChatProductId(prod.id);
    setChatProduct(prod);
    setChatPost(null);
    setChatBuyerRequest(null);
    setMessagesChannel('direct');
    setSelectedProduct(null);
    setCurrentView('messages');
    try {
      localStorage.setItem('agrox_current_view', 'messages');
      window.history.pushState({ view: 'messages' }, '', '#messages');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openChatWithPost = (post: MediaPost) => {
    const sellerFallback: User = {
      id: post.farmerId,
      name: post.farmerName || 'Farm Seller',
      email: '',
      phone: '',
      role: post.sellerRole || 'farmer',
      avatar: post.farmerAvatar || '/images/community/community_tomato_greenhouse.jpg',
      location: {
        country: 'Zimbabwe',
        province: 'Harare',
        city: post.location || 'Harare'
      },
      status: 'active',
      createdAt: post.createdAt || new Date().toISOString(),
      farmerProfile: {
        farmName: post.farmName || `${post.farmerName}'s Farm`,
        isVerified: true
      }
    };
    setChatRecipientId(post.farmerId);
    setChatRecipientUser(sellerFallback);
    setChatProductId(post.taggedProductId || null);
    setChatProduct(null);
    setChatPost(post);
    setChatBuyerRequest(null);
    setMessagesChannel('direct');
    setCurrentView('messages');
    try {
      localStorage.setItem('agrox_current_view', 'messages');
      window.history.pushState({ view: 'messages' }, '', '#messages');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleRequestQuoteFromPost = (post: MediaPost) => {
    if (!user) {
      setPendingChatPost(post);
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    if (requiresEmailVerification) {
      setPendingChatPost(post);
      setAuthMode('verify_email');
      setIsAuthOpen(true);
      return;
    }
    openChatWithPost(post);
  };

  const handleRespondToBuyerRequest = (req: BuyerRequest) => {
    if (requiresEmailVerification) {
      setAuthMode('verify_email');
      setIsAuthOpen(true);
      return;
    }
    const buyerFallback: User = {
      id: req.buyerId,
      name: req.buyerName || 'Marketplace Buyer',
      email: '',
      phone: req.buyerPhone || '',
      role: 'buyer',
      avatar: req.buyerAvatar || '',
      location: {
        country: 'Zimbabwe',
        province: 'Harare',
        city: req.location || 'Harare'
      },
      status: 'active',
      createdAt: req.createdAt || new Date().toISOString()
    };
    setChatRecipientId(req.buyerId);
    setChatRecipientUser(buyerFallback);
    setChatProductId(null);
    setChatProduct(null);
    setChatPost(null);
    setChatBuyerRequest(req);
    setMessagesChannel('direct');
    setCurrentView('messages');
    try {
      localStorage.setItem('agrox_current_view', 'messages');
      window.history.pushState({ view: 'messages' }, '', '#messages');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Automatically open pending 1-on-1 chat once user completes login & verification
  useEffect(() => {
    if (!user || requiresEmailVerification) return;
    if (pendingChatProduct) {
      const targetProd = pendingChatProduct;
      setPendingChatProduct(null);
      setIsAuthOpen(false);
      openChatWithProduct(targetProd);
    } else if (pendingChatPost) {
      const targetPost = pendingChatPost;
      setPendingChatPost(null);
      setIsAuthOpen(false);
      openChatWithPost(targetPost);
    } else if (pendingChatUser) {
      const targetUser = pendingChatUser;
      setPendingChatUser(null);
      setIsAuthOpen(false);
      setChatRecipientId(targetUser.id);
      setChatRecipientUser(targetUser);
      setChatProductId(null);
      setChatProduct(null);
      setChatPost(null);
      setChatBuyerRequest(null);
      setMessagesChannel('direct');
      setCurrentView('messages');
      try {
        window.history.pushState({ view: 'messages' }, '', '#messages');
      } catch {}
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [user, requiresEmailVerification, pendingChatProduct, pendingChatPost, pendingChatUser]);

  useEffect(() => {
    if (currentView === 'marketplace' && pendingScrollSection) {
      const targetId = pendingScrollSection;
      setPendingScrollSection(null);
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [currentView, pendingScrollSection]);

  const handleScrollToSection = (sectionId: string) => {
    mobileService.triggerHaptic('light');
    if (currentView !== 'marketplace') {
      setPendingScrollSection(sectionId);
      setCurrentView('marketplace');
      try {
        localStorage.setItem('agrox_current_view', 'marketplace');
      } catch {}
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleNavigate = (view: string, data?: any) => {
    mobileService.triggerHaptic('light');
    if (!user && PROTECTED_VIEWS.has(view)) {
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    if (user && requiresEmailVerification && PROTECTED_VIEWS.has(view)) {
      setAuthMode('verify_email');
      setIsAuthOpen(true);
      return;
    }
    if (view === 'messages' && data?.channel) {
      setMessagesChannel(data.channel);
    }
    if (data?.scrollTo) {
      setPendingScrollSection(data.scrollTo);
    }
    const isViewChanging = view !== currentView;
    setCurrentView(view);
    try {
      localStorage.setItem('agrox_current_view', view);
      if (isViewChanging) {
        window.history.pushState({ view }, '', `#${view}`);
      }
    } catch (e) {
      console.warn('Could not save current view:', e);
    }
    if (isViewChanging && !data?.scrollTo) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    if (view === 'farm_profile' && data?.farmerId) {
      setSelectedFarmerId(data.farmerId);
    }
    if (view === 'orders' && data?.selectedOrder) {
      setSelectedOrderForTracking(data.selectedOrder);
    }
  };

  const handleSelectFarmer = (farmerId: string) => {
    setSelectedFarmerId(farmerId);
    setSelectedProduct(null);
    setCurrentView('farm_profile');
    try {
      window.history.pushState({ view: 'farm_profile' }, '', '#farm_profile');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleContactFarmerFromProduct = (prod: Product) => {
    if (!user) {
      setPendingChatProduct(prod);
      setSelectedProduct(null);
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    if (requiresEmailVerification) {
      setPendingChatProduct(prod);
      setSelectedProduct(null);
      setAuthMode('verify_email');
      setIsAuthOpen(true);
      return;
    }
    openChatWithProduct(prod);
  };

  const handleContactFarmerFromUser = (farmer: User) => {
    if (!user) {
      setPendingChatUser(farmer);
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    if (requiresEmailVerification) {
      setPendingChatUser(farmer);
      setAuthMode('verify_email');
      setIsAuthOpen(true);
      return;
    }
    setChatRecipientId(farmer.id);
    setChatRecipientUser(farmer);
    setChatProductId(null);
    setChatProduct(null);
    setMessagesChannel('direct');
    setCurrentView('messages');
    try {
      window.history.pushState({ view: 'messages' }, '', '#messages');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleContactFromOrder = (recipientId: string, _orderId?: string) => {
    if (!user) {
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    if (requiresEmailVerification) {
      setAuthMode('verify_email');
      setIsAuthOpen(true);
      return;
    }
    setChatRecipientId(recipientId);
    setChatRecipientUser(null);
    setChatProductId(null);
    setChatProduct(null);
    setMessagesChannel('direct');
    setCurrentView('messages');
    try {
      window.history.pushState({ view: 'messages' }, '', '#messages');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleSelectNotification = (notif: AppNotification) => {
    setIsNotificationsOpen(false);
    if (notif.type === 'order') {
      if (isSellerRole(user?.role)) {
        setFarmerInitialTab('orders');
        setCurrentView('farmer_dashboard');
      } else {
        setCurrentView('orders');
      }
    } else if (notif.type === 'message' || notif.type === 'post') {
      setMessagesChannel('direct');
      setCurrentView('messages');
    } else if (notif.type === 'request') {
      if (notif.link?.includes('/messages')) {
        setMessagesChannel('direct');
        setCurrentView('messages');
      } else if (isSellerRole(user?.role)) {
        setFarmerInitialTab('requests');
        setCurrentView('farmer_dashboard');
      } else {
        setCurrentView('buyer_dashboard');
      }
    } else if (notif.type === 'inventory' && isSellerRole(user?.role)) {
      setFarmerInitialTab('products');
      setCurrentView('farmer_dashboard');
    }
  };

  return (
    <AndroidDeviceShell
      isAndroidView={isAndroidView}
      setIsAndroidView={setIsAndroidView}
    >
      <div className="min-h-screen bg-[#F8FAF7] text-[#0B261C] flex flex-col selection:bg-[#A8E635] selection:text-[#062B1F] pb-20 md:pb-0 relative overflow-x-clip">
        <LiquidGlassDefs />

        {/* Browser Cookie & Storage Access Authorization Banner */}
        <CookieAccessBanner />

        {/* Platform Announcements Banner */}
        <AnnouncementsBanner />

        {/* Main Liquid Glass Navigation Bar */}
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenAuth={(mode) => {
            setAuthMode(mode || 'login');
            setIsAuthOpen(true);
          }}
          onOpenNotifications={() => {
            if (requiresEmailVerification) {
              setAuthMode('verify_email');
              setIsAuthOpen(true);
              return;
            }
            setIsNotificationsOpen(true);
          }}
          onOpenCart={openCart}
          onOpenAddProduct={() => {
            if (requiresEmailVerification) {
              setAuthMode('verify_email');
              setIsAuthOpen(true);
              return;
            }
            setEditingProduct(null);
            setIsAddProductOpen(true);
          }}
          onOpenSettings={() => {
            if (requiresEmailVerification) {
              setAuthMode('verify_email');
              setIsAuthOpen(true);
              return;
            }
            setIsUserSettingsOpen(true);
          }}
          searchQuery={marketplaceSearchQuery}
          onSearchChange={setMarketplaceSearchQuery}
          onSearchSubmit={(q) => {
            setMarketplaceSearchQuery(q);
            handleScrollToSection('fresh-from-farmers');
          }}
          onScrollToSection={handleScrollToSection}
        />

        {/* Main Application Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-14">
          {user && requiresEmailVerification && (
            <div
              role="status"
              className="mb-6 p-4 rounded-2xl lg-glass-mint border border-amber-400/50 text-[#062B1F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-start gap-3 text-xs sm:text-sm font-semibold">
                <MailCheck className="w-5 h-5 text-[#145A38] shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-[#062B1F]">
                    Verify your email to activate your FarmBridge account
                  </p>
                  <p className="text-xs text-[#2B4338] mt-0.5">
                    We sent a verification link to <strong>{user.email}</strong>. Please check your inbox and verify before listing products, uploading media, messaging, or placing orders.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <LiquidGlassButton
                  type="button"
                  variant="emerald"
                  size="xs"
                  onClick={() => {
                    setAuthMode('verify_email');
                    setIsAuthOpen(true);
                  }}
                >
                  Verify Email
                </LiquidGlassButton>
                <LiquidGlassButton
                  type="button"
                  variant="light"
                  size="xs"
                  onClick={() => {
                    logout();
                  }}
                >
                  Sign Out
                </LiquidGlassButton>
              </div>
            </div>
          )}

          {accountDeletionNotice && (
            <div
              role="status"
              className="mb-6 p-4 rounded-2xl lg-glass-mint border border-[#145A38]/20 text-[#062B1F] flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3 text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 text-[#145A38] shrink-0 mt-0.5" />
                <span>{accountDeletionNotice}</span>
              </div>
              <button
                type="button"
                onClick={clearAccountDeletionNotice}
                className="p-1.5 rounded-xl hover:bg-[#145A38]/10 text-[#145A38] transition-colors shrink-0 cursor-pointer"
                aria-label="Dismiss account deletion confirmation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {suspensionNotice && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-rose-50/90 backdrop-blur-md border border-rose-200 text-rose-900 flex items-start justify-between gap-3 shadow-sm"
            >
              <div className="flex items-start gap-3 text-xs sm:text-sm font-semibold">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <span>{suspensionNotice}</span>
              </div>
              <button
                type="button"
                onClick={clearSuspensionNotice}
                className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-700 transition-colors shrink-0 cursor-pointer"
                aria-label="Dismiss suspension notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentView === 'marketplace' && (
            <Marketplace
              onSelectProduct={setSelectedProduct}
              onSelectFarmer={handleSelectFarmer}
              onContactFarmer={handleContactFarmerFromProduct}
              onRequestQuote={handleRequestQuoteFromPost}
              onRespondToBuyerRequest={handleRespondToBuyerRequest}
              onOpenAuth={(mode) => {
                setAuthMode(mode);
                setIsAuthOpen(true);
              }}
              onNavigate={handleNavigate}
              externalSearchQuery={marketplaceSearchQuery}
              onSearchQueryChange={setMarketplaceSearchQuery}
            />
          )}

          {currentView === 'farmer_dashboard' && (
            <FarmerDashboard
              initialTab={farmerInitialTab}
              onOpenAddProduct={() => {
                setEditingProduct(null);
                setIsAddProductOpen(true);
              }}
              onEditProduct={(p) => {
                setEditingProduct(p);
                setIsAddProductOpen(true);
              }}
              onViewProduct={setSelectedProduct}
              onViewFarm={handleSelectFarmer}
              onViewOrder={(o) => {
                setSelectedOrderForTracking(o);
                setCurrentView('orders');
              }}
              onRespondToRequest={handleRespondToBuyerRequest}
              onNavigate={handleNavigate}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenSettings={() => setIsUserSettingsOpen(true)}
            />
          )}

          {currentView === 'buyer_dashboard' && (
            <BuyerDashboard
              onNavigate={handleNavigate}
              onSelectProduct={setSelectedProduct}
              onOpenReviewModal={setReviewOrder}
              onOpenSettings={() => setIsUserSettingsOpen(true)}
              onOpenMessagesForRequest={() => {
                setMessagesChannel('direct');
                setCurrentView('messages');
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
            />
          )}

          {currentView === 'admin' && <AdminDashboard />}

          {currentView === 'orders' && (
            <OrderManagement
              initialSelectedOrder={selectedOrderForTracking}
              onContactFarmer={handleContactFromOrder}
              onOpenReviewModal={setReviewOrder}
              onOpenAuth={(mode) => {
                setAuthMode(mode);
                setIsAuthOpen(true);
              }}
            />
          )}

          {currentView === 'messages' && (
            <MessagingHub
              initialRecipientId={chatRecipientId}
              initialRecipientUser={chatRecipientUser}
              initialProductId={chatProductId}
              initialProduct={chatProduct}
              initialPost={chatPost}
              initialBuyerRequest={chatBuyerRequest}
              defaultChannel={messagesChannel}
            />
          )}

          {currentView === 'favorites' && (
            <FavoritesView
              onBack={() => setCurrentView('marketplace')}
              onSelectProduct={setSelectedProduct}
            />
          )}

          {currentView === 'farm_profile' && selectedFarmerId && (
            <FarmProfileView
              farmerId={selectedFarmerId}
              onBack={() => setCurrentView('marketplace')}
              onSelectProduct={setSelectedProduct}
              onContactFarmer={handleContactFarmerFromUser}
              onRequestQuote={handleRequestQuoteFromPost}
            />
          )}
        </main>

        {/* Liquid Glass Deep Forest Global Footer */}
        <footer className="relative bg-linear-to-b from-[#0B3D2B] to-[#062B1F] border-t border-white/15 text-[#DFF4E4]/75 text-xs py-12 mt-auto overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-10 w-80 h-80 rounded-full bg-[#A8E635]/10 blur-3xl"
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Brand & Description */}
              <div className="space-y-3 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 flex items-center justify-center shrink-0">
                    <img
                      src="/assets/farmbridge-logo-white.png"
                      alt="FarmBridge logo"
                      className="w-full h-full object-contain drop-shadow-sm"
                    />
                  </div>
                  <span className="font-extrabold text-white text-base tracking-tight">
                    FarmBridge<span className="text-[#A8E635]">.</span>
                  </span>
                </div>
                <p className="text-[#DFF4E4]/70 text-xs leading-relaxed max-w-xs">
                  Connecting buyers directly with local farmers and fodder suppliers for fresh harvest produce, transparent sourcing, and reliable farm-gate delivery.
                </p>
              </div>

              {/* Marketplace Links */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                  Marketplace
                </h5>
                <ul className="space-y-2 text-[#DFF4E4]/75">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleScrollToSection('fresh-from-farmers')}
                      className="hover:text-[#A8E635] transition-colors cursor-pointer"
                    >
                      Browse Produce
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleScrollToSection('featured-farmers-section')}
                      className="hover:text-[#A8E635] transition-colors cursor-pointer"
                    >
                      Meet Our Farmers
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => (user ? handleNavigate('orders') : setIsAuthOpen(true))}
                      className="hover:text-[#A8E635] transition-colors cursor-pointer"
                    >
                      Order Tracking
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        if (user?.role === 'buyer') handleNavigate('buyer_dashboard');
                        else if (isSellerRole(user?.role)) handleNavigate('farmer_dashboard');
                        else setIsAuthOpen(true);
                      }}
                      className="hover:text-[#A8E635] transition-colors cursor-pointer"
                    >
                      Account Dashboard
                    </button>
                  </li>
                </ul>
              </div>

              {/* Community Links */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                  Community
                </h5>
                <ul className="space-y-2 text-[#DFF4E4]/75">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleScrollToSection('farmbridge-community-section')}
                      className="hover:text-[#A8E635] transition-colors cursor-pointer"
                    >
                      FarmBridge Community
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleScrollToSection('buyer-requests-section')}
                      className="hover:text-[#A8E635] transition-colors cursor-pointer"
                    >
                      Buyer Requests
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setInfoModal('support')}
                      className="hover:text-[#A8E635] transition-colors cursor-pointer"
                    >
                      Help & Support
                    </button>
                  </li>
                  <li>
                    <button
                      id="footer-install-application-btn"
                      type="button"
                      onClick={() => setIsInstallModalOpen(true)}
                      className="hover:text-[#A8E635] transition-colors cursor-pointer"
                    >
                      Install Application
                    </button>
                  </li>
                </ul>
              </div>

              {/* Contact & Legal */}
              <div className="space-y-3">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                  Contact & Legal
                </h5>
                <div className="space-y-2 text-[#DFF4E4]/75">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#A8E635] shrink-0" />
                    <a
                      href="tel:+263716930165"
                      className="hover:text-[#A8E635] transition-colors"
                    >
                      +263 716 930 165
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#A8E635] shrink-0" />
                    <a
                      href="mailto:farmbridge2026@gmail.com"
                      className="hover:text-[#A8E635] transition-colors break-all"
                    >
                      farmbridge2026@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#A8E635] shrink-0" />
                    <span>Bulawayo, Zimbabwe</span>
                  </div>
                </div>
                <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setInfoModal('privacy')}
                    className="hover:text-[#A8E635] underline-offset-2 hover:underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  <span className="text-white/25">·</span>
                  <button
                    type="button"
                    onClick={() => setInfoModal('terms')}
                    className="hover:text-[#A8E635] underline-offset-2 hover:underline cursor-pointer"
                  >
                    Terms & Conditions
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-white/12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#DFF4E4]/60 text-[11px]">
              <div>© {new Date().getFullYear()} FarmBridge Agricultural Marketplace. All rights reserved.</div>
              <div className="flex items-center gap-4">
                <span>Direct Farm Trade</span>
                <span>·</span>
                <button
                  id="footer-bottom-admin-access-link"
                  type="button"
                  onClick={() => setIsAdminAccessOpen(true)}
                  className="text-[#DFF4E4]/80 hover:text-[#A8E635] transition-colors inline-flex items-center gap-1.5 font-semibold cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Admin Access</span>
                </button>
              </div>
            </div>
          </div>
        </footer>

        {/* Modals & Overlays */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onSelectFarmer={handleSelectFarmer}
            onContactFarmer={handleContactFarmerFromProduct}
            onReportProduct={(p) => {
              setSelectedProduct(null);
              setReportProduct(p);
            }}
            onSelectRelatedProduct={setSelectedProduct}
          />
        )}

        {isAdminAccessOpen && (
          <AdminAccessModal
            isOpen={isAdminAccessOpen}
            onClose={() => setIsAdminAccessOpen(false)}
            onSuccess={() => {
              setIsAdminAccessOpen(false);
              setCurrentView('admin');
              try {
                window.history.pushState({ view: 'admin' }, '', '#admin');
              } catch {}
              window.scrollTo({ top: 0, behavior: 'auto' });
            }}
          />
        )}

        {isAddProductOpen && (
          <AddEditProductModal
            product={editingProduct}
            onClose={() => {
              setIsAddProductOpen(false);
              setEditingProduct(null);
            }}
            onSuccess={() => {
              setIsAddProductOpen(false);
              setEditingProduct(null);
            }}
          />
        )}

        <CartDrawer />

        {isCheckoutOpen && (
          <CheckoutModal
            onClose={closeCheckout}
            onRequireAuth={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
            onRequireVerifyEmail={() => {
              setAuthMode('verify_email');
              setIsAuthOpen(true);
            }}
            onOrderSuccess={(orders) => {
              closeCheckout();
              setConfirmedOrders(orders);
            }}
          />
        )}

        {confirmedOrders && confirmedOrders.length > 0 && (
          <OrderConfirmationModal
            orders={confirmedOrders}
            onViewOrders={(primaryOrder) => {
              setConfirmedOrders(null);
              setSelectedOrderForTracking(primaryOrder);
              handleNavigate('orders', { selectedOrder: primaryOrder });
            }}
            onReturnHome={() => {
              setConfirmedOrders(null);
              handleNavigate('marketplace');
            }}
          />
        )}

        {reviewOrder && (
          <ReviewModal
            order={reviewOrder}
            onClose={() => setReviewOrder(null)}
            onSuccess={() => {
              setReviewOrder(null);
            }}
          />
        )}

        {reportProduct && (
          <ReportModal
            product={reportProduct}
            onClose={() => setReportProduct(null)}
          />
        )}

        {isAuthOpen && (
          <AuthModal
            initialMode={authMode}
            onClose={() => {
              setIsAuthOpen(false);
              setPendingChatProduct(null);
              setPendingChatPost(null);
              setPendingChatUser(null);
            }}
          />
        )}

        {isNotificationsOpen && (
          <NotificationsModal
            onClose={() => setIsNotificationsOpen(false)}
            onSelectNotification={handleSelectNotification}
          />
        )}

        {isFarmerProfileOpen && (
          <FarmerProfileModal
            onClose={() => setIsFarmerProfileOpen(false)}
            onSuccess={() => {
              setIsFarmerProfileOpen(false);
            }}
          />
        )}

        <UserSettingsModal
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
          onAccountDeleted={() => {
            setIsUserSettingsOpen(false);
            handleNavigate('marketplace');
          }}
        />

        {/* Android Material 3 Bottom Navigation Bar */}
        <AndroidBottomNav
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenNotifications={() => {
            if (requiresEmailVerification) {
              setAuthMode('verify_email');
              setIsAuthOpen(true);
              return;
            }
            setIsNotificationsOpen(true);
          }}
          onOpenCart={openCart}
          onOpenAddProduct={() => {
            if (requiresEmailVerification) {
              setAuthMode('verify_email');
              setIsAuthOpen(true);
              return;
            }
            setEditingProduct(null);
            setIsAddProductOpen(true);
          }}
        />

        {/* Android PWA / APK Install Modal */}
        <AndroidInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />

        {/* Footer Info Modal (Help & Support, Privacy Policy, Terms & Conditions) */}
        <LiquidGlassModal
          isOpen={Boolean(infoModal)}
          onClose={() => setInfoModal(null)}
          title={
            infoModal === 'support'
              ? 'Help & Support'
              : infoModal === 'privacy'
              ? 'Privacy Policy'
              : 'Terms & Conditions'
          }
          subtitle="FarmBridge Agricultural Marketplace"
          icon={
            <img
              src="/assets/farmbridge-logo-white.png"
              alt="FarmBridge logo"
              className="w-6 h-6 object-contain"
            />
          }
          maxWidthClass="max-w-lg"
        >
          <div className="p-6 space-y-4">
            {infoModal === 'support' && (
              <div className="space-y-3 text-xs text-[#0B261C]/80 leading-relaxed">
                <p>
                  Need help with an order, Proof of Payment verification, or connecting with a local producer? Reach our marketplace support desk directly:
                </p>
                <div className="p-4 rounded-2xl lg-glass-mint border border-[#145A38]/15 space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-[#062B1F]">
                    <Phone className="w-4 h-4 text-[#145A38] shrink-0" />
                    <a href="tel:+263716930165" className="hover:underline">
                      +263 716 930 165 (Mon–Sat, 08:00–17:00)
                    </a>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-[#062B1F]">
                    <Mail className="w-4 h-4 text-[#145A38] shrink-0" />
                    <a href="mailto:farmbridge2026@gmail.com" className="hover:underline break-all">
                      farmbridge2026@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-[#062B1F]">
                    <MapPin className="w-4 h-4 text-[#145A38] shrink-0" />
                    <span>Bulawayo, Zimbabwe</span>
                  </div>
                </div>
              </div>
            )}

            {infoModal === 'privacy' && (
              <div className="space-y-3 text-xs text-[#0B261C]/80 leading-relaxed">
                <p>
                  FarmBridge collects only the contact, delivery, and farm profile details required to fulfill agricultural orders and enable 1-on-1 messaging between buyers and sellers.
                </p>
                <p>
                  Uploaded Proof of Payment files and order histories are visible solely to the buyer, the fulfilling producer, and authorized platform administrators. You may delete your account at any time from User Settings.
                </p>
              </div>
            )}

            {infoModal === 'terms' && (
              <div className="space-y-3 text-xs text-[#0B261C]/80 leading-relaxed">
                <p>
                  Producers on FarmBridge agree to list accurate harvest availability, pricing, and regional pickup or delivery terms. Buyers agree to submit authentic Proof of Payment for electronic orders or settle Cash on Delivery upon receipt.
                </p>
                <p>
                  Disputes or listing concerns can be reported directly from any product page for administrative review.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <LiquidGlassButton type="button" variant="emerald" size="sm" onClick={() => setInfoModal(null)}>
                Close
              </LiquidGlassButton>
            </div>
          </div>
        </LiquidGlassModal>
      </div>
    </AndroidDeviceShell>
  );
}
export default App;
