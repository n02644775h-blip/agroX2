import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { mobileService } from './services/mobileService';
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
import { AuthModal } from './components/AuthModal';
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
  Sprout,
  ShieldCheck,
  Truck,
  HeartHandshake,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Lock,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';

export function App() {
  const {
    user,
    suspensionNotice,
    clearSuspensionNotice,
    accountDeletionNotice,
    clearAccountDeletionNotice
  } = useAuth();
  const { openCart, isCheckoutOpen, closeCheckout } = useCart();

  // Navigation State with persistence across refreshes
  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      return localStorage.getItem('agrox_current_view') || 'marketplace';
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
  const [farmerRefreshKey, setFarmerRefreshKey] = useState(0);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reportProduct, setReportProduct] = useState<Product | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminAccessOpen, setIsAdminAccessOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isFarmerProfileOpen, setIsFarmerProfileOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isAndroidView, setIsAndroidView] = useState(false);
  const [marketplaceSearchQuery, setMarketplaceSearchQuery] = useState('');
  const [pendingScrollSection, setPendingScrollSection] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<'support' | 'privacy' | 'terms' | null>(null);

  // Redirect to marketplace cleanly when signed out or account is deleted while on a protected view
  useEffect(() => {
    if (
      !user &&
      ['farmer_dashboard', 'buyer_dashboard', 'admin', 'messages', 'favorites'].includes(currentView)
    ) {
      setCurrentView('marketplace');
      try {
        localStorage.setItem('agrox_current_view', 'marketplace');
      } catch {}
    }
  }, [user, currentView]);

  // Initialize native Capacitor mobile services (Splash Screen, Status Bar, Back Button)
  useEffect(() => {
    mobileService.initMobileApp();

    const backListener = mobileService.registerBackButton(() => {
      // Close open modals first on hardware back button press
      if (selectedProduct) { setSelectedProduct(null); return true; }
      if (isAddProductOpen) { setIsAddProductOpen(false); return true; }
      if (isCheckoutOpen) { closeCheckout(); return true; }
      if (reviewOrder) { setReviewOrder(null); return true; }
      if (reportProduct) { setReportProduct(null); return true; }
      if (isAuthOpen) { setIsAuthOpen(false); return true; }
      if (isNotificationsOpen) { setIsNotificationsOpen(false); return true; }
      if (isAdminAccessOpen) { setIsAdminAccessOpen(false); return true; }
      if (isInstallModalOpen) { setIsInstallModalOpen(false); return true; }

      // If on a sub-view, go back to marketplace
      if (currentView !== 'marketplace') {
        setCurrentView('marketplace');
        return true;
      }
      return false;
    });

    return () => {
      // Clean up back button listener
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
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestQuoteFromPost = (post: MediaPost) => {
    if (!user) {
      setPendingChatPost(post);
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    openChatWithPost(post);
  };

  const handleRespondToBuyerRequest = (req: BuyerRequest) => {
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
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Automatically open pending 1-on-1 chat once user completes login
  useEffect(() => {
    if (!user) return;
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [user, pendingChatProduct, pendingChatPost, pendingChatUser]);

  // Handle scrolling to homepage section anchors even when navigating from sub-views
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

  // Handle navigation
  const handleNavigate = (view: string, data?: any) => {
    mobileService.triggerHaptic('light');
    if (view === 'messages' && data?.channel) {
      setMessagesChannel(data.channel);
    }
    if (data?.scrollTo) {
      setPendingScrollSection(data.scrollTo);
    }
    setCurrentView(view);
    try {
      localStorage.setItem('agrox_current_view', view);
    } catch (e) {
      console.warn('Could not save current view:', e);
    }
    if (!data?.scrollTo) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (view === 'orders' && data?.selectedOrder) {
      setSelectedOrderForTracking(data.selectedOrder);
    }
  };

  // Open farm profile
  const handleSelectFarmer = (farmerId: string) => {
    setSelectedFarmerId(farmerId);
    setSelectedProduct(null);
    setCurrentView('farm_profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Direct contact farmer from product
  const handleContactFarmerFromProduct = (prod: Product) => {
    if (!user) {
      setPendingChatProduct(prod);
      setSelectedProduct(null);
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    openChatWithProduct(prod);
  };

  // Direct contact farmer from user profile
  const handleContactFarmerFromUser = (farmer: User) => {
    if (!user) {
      setPendingChatUser(farmer);
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    setChatRecipientId(farmer.id);
    setChatRecipientUser(farmer);
    setChatProductId(null);
    setChatProduct(null);
    setMessagesChannel('direct');
    setCurrentView('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Contact farmer/buyer from order
  const handleContactFromOrder = (recipientId: string, _orderId?: string) => {
    if (!user) {
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    setChatRecipientId(recipientId);
    setChatRecipientUser(null);
    setChatProductId(null);
    setChatProduct(null);
    setMessagesChannel('direct');
    setCurrentView('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Notification action handler
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
      onOpenInstallModal={() => setIsInstallModalOpen(true)}
      isAndroidView={isAndroidView}
      setIsAndroidView={setIsAndroidView}
    >
      <div className="min-h-screen bg-[#F8FAF7] text-[#202B24] font-sans flex flex-col selection:bg-[#174B35] selection:text-white pb-20 md:pb-0">
        {/* Browser Cookie & Storage Access Authorization Banner */}
        <CookieAccessBanner />

        {/* Platform Announcements Banner */}
        <AnnouncementsBanner />

        {/* Main Responsive Navigation Bar */}
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setIsAuthOpen(true);
          }}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenCart={openCart}
          onOpenAddProduct={() => {
            setEditingProduct(null);
            setIsAddProductOpen(true);
          }}
          onOpenInstallApp={() => setIsInstallModalOpen(true)}
          onOpenSettings={() => setIsUserSettingsOpen(true)}
          searchQuery={marketplaceSearchQuery}
          onSearchChange={setMarketplaceSearchQuery}
          onSearchSubmit={(q) => {
            setMarketplaceSearchQuery(q);
            handleScrollToSection('fresh-from-farmers');
          }}
          onScrollToSection={handleScrollToSection}
        />

      {/* Main Application Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12">
        {accountDeletionNotice && (
          <div
            role="status"
            className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-3 text-xs sm:text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{accountDeletionNotice}</span>
            </div>
            <button
              onClick={clearAccountDeletionNotice}
              className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors shrink-0"
              aria-label="Dismiss account deletion confirmation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {suspensionNotice && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-3 text-xs sm:text-sm font-semibold">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{suspensionNotice}</span>
            </div>
            <button
              onClick={clearSuspensionNotice}
              className="p-1 rounded-lg hover:bg-red-100 text-red-600 transition-colors shrink-0"
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
            key={`farmer-dash-${farmerRefreshKey}`}
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
              window.scrollTo({ top: 0, behavior: 'smooth' });
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
          />
        )}
      </main>

      {/* Minimalist Global Footer */}
      <footer className="bg-white border-t border-[#E8EEE8] text-[#202B24]/70 text-xs py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand & Description */}
            <div className="space-y-3 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#174B35] flex items-center justify-center text-white">
                  <Sprout className="w-4 h-4" />
                </div>
                <span className="font-bold text-[#202B24] text-base tracking-tight">FarmBridge</span>
              </div>
              <p className="text-[#202B24]/65 text-xs leading-relaxed max-w-xs">
                Connecting buyers directly with local farmers and fodder suppliers for fresh produce, transparent sourcing, and reliable farm-gate delivery.
              </p>
            </div>

            {/* Marketplace Links */}
            <div className="space-y-3">
              <h5 className="font-semibold text-[#202B24] text-xs uppercase tracking-wider">
                Marketplace
              </h5>
              <ul className="space-y-2 text-[#202B24]/70">
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollToSection('fresh-from-farmers')}
                    className="hover:text-[#174B35] transition-colors"
                  >
                    Browse Produce
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollToSection('featured-farmers-section')}
                    className="hover:text-[#174B35] transition-colors"
                  >
                    Meet Our Farmers
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => (user ? handleNavigate('orders') : setIsAuthOpen(true))}
                    className="hover:text-[#174B35] transition-colors"
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
                    className="hover:text-[#174B35] transition-colors"
                  >
                    Account Dashboard
                  </button>
                </li>
              </ul>
            </div>

            {/* Community Links */}
            <div className="space-y-3">
              <h5 className="font-semibold text-[#202B24] text-xs uppercase tracking-wider">
                Community
              </h5>
              <ul className="space-y-2 text-[#202B24]/70">
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollToSection('farmbridge-community-section')}
                    className="hover:text-[#174B35] transition-colors"
                  >
                    FarmBridge Community
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollToSection('buyer-requests-section')}
                    className="hover:text-[#174B35] transition-colors"
                  >
                    Buyer Requests
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setInfoModal('support')}
                    className="hover:text-[#174B35] transition-colors"
                  >
                    Help & Support
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsInstallModalOpen(true)}
                    className="hover:text-[#174B35] transition-colors"
                  >
                    Android App
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Legal */}
            <div className="space-y-3">
              <h5 className="font-semibold text-[#202B24] text-xs uppercase tracking-wider">
                Contact & Legal
              </h5>
              <div className="space-y-2 text-[#202B24]/70">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#77A987] shrink-0" />
                  <span>+263 77 123 4567</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#77A987] shrink-0" />
                  <span>support@agrox.market</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#77A987] shrink-0" />
                  <span>Harare & Provincial Hubs</span>
                </div>
              </div>
              <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInfoModal('privacy')}
                  className="hover:text-[#174B35] underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </button>
                <span className="text-[#E8EEE8]">·</span>
                <button
                  type="button"
                  onClick={() => setInfoModal('terms')}
                  className="hover:text-[#174B35] underline-offset-2 hover:underline"
                >
                  Terms & Conditions
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E8EEE8] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#202B24]/55 text-[11px]">
            <div>© {new Date().getFullYear()} FarmBridge Agricultural Marketplace. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <span>Direct Farm Trade</span>
              <span>·</span>
              <button
                id="footer-bottom-admin-access-link"
                type="button"
                onClick={() => setIsAdminAccessOpen(true)}
                className="text-[#202B24]/70 hover:text-[#174B35] transition-colors inline-flex items-center gap-1 font-medium"
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
            setFarmerRefreshKey(k => k + 1);
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
            setFarmerRefreshKey(k => k + 1);
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
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenCart={openCart}
        onOpenAddProduct={() => {
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
      {infoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full border border-[#E8EEE8] shadow-xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8EEE8] pb-3">
              <h3 className="text-base font-bold text-[#202B24]">
                {infoModal === 'support'
                  ? 'Help & Support'
                  : infoModal === 'privacy'
                  ? 'Privacy Policy'
                  : 'Terms & Conditions'}
              </h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="p-1.5 rounded-xl text-[#202B24]/50 hover:text-[#202B24] hover:bg-[#F8FAF7]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {infoModal === 'support' && (
              <div className="space-y-3 text-xs text-[#202B24]/75 leading-relaxed">
                <p>
                  Need help with an order, Proof of Payment verification, or connecting with a local producer? Reach our marketplace support desk directly:
                </p>
                <div className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-[#E8EEE8] space-y-2">
                  <div className="flex items-center gap-2 font-medium text-[#202B24]">
                    <Phone className="w-4 h-4 text-[#174B35]" />
                    <span>+263 77 123 4567 (Mon–Sat, 08:00–17:00)</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-[#202B24]">
                    <Mail className="w-4 h-4 text-[#174B35]" />
                    <span>support@agrox.market</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-[#202B24]">
                    <MapPin className="w-4 h-4 text-[#174B35]" />
                    <span>Harare & Provincial Agricultural Hubs</span>
                  </div>
                </div>
              </div>
            )}

            {infoModal === 'privacy' && (
              <div className="space-y-2.5 text-xs text-[#202B24]/75 leading-relaxed">
                <p>
                  FarmBridge collects only the contact, delivery, and farm profile details required to fulfill agricultural orders and enable 1-on-1 messaging between buyers and sellers.
                </p>
                <p>
                  Uploaded Proof of Payment files and order histories are visible solely to the buyer, the fulfilling producer, and authorized platform administrators. You may delete your account at any time from User Settings.
                </p>
              </div>
            )}

            {infoModal === 'terms' && (
              <div className="space-y-2.5 text-xs text-[#202B24]/75 leading-relaxed">
                <p>
                  Producers on FarmBridge agree to list accurate harvest availability, pricing, and regional pickup or delivery terms. Buyers agree to submit authentic Proof of Payment for electronic orders or settle Cash on Delivery upon receipt.
                </p>
                <p>
                  Disputes or listing concerns can be reported directly from any product page for administrative review.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="px-4 py-2 rounded-xl bg-[#174B35] text-white text-xs font-semibold hover:bg-[#123c2a] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </AndroidDeviceShell>
);
}
export default App;
