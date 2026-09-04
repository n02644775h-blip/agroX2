import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
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
import { Product, Order, User, AppNotification } from './types';
import {
  Sprout,
  ShieldCheck,
  Truck,
  HeartHandshake,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Lock
} from 'lucide-react';

export function App() {
  const { user } = useAuth();

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
  const [chatProductId, setChatProductId] = useState<string | null>(null);

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [farmerRefreshKey, setFarmerRefreshKey] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reportProduct, setReportProduct] = useState<Product | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminAccessOpen, setIsAdminAccessOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isFarmerProfileOpen, setIsFarmerProfileOpen] = useState(false);
  const [isAndroidView, setIsAndroidView] = useState(false);

  // Initialize native Capacitor mobile services (Splash Screen, Status Bar, Back Button)
  useEffect(() => {
    mobileService.initMobileApp();

    const backListener = mobileService.registerBackButton(() => {
      // Close open modals first on hardware back button press
      if (selectedProduct) { setSelectedProduct(null); return true; }
      if (isAddProductOpen) { setIsAddProductOpen(false); return true; }
      if (isCheckoutOpen) { setIsCheckoutOpen(false); return true; }
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

  // Handle navigation
  const handleNavigate = (view: string, data?: any) => {
    mobileService.triggerHaptic('light');
    setCurrentView(view);
    try {
      localStorage.setItem('agrox_current_view', view);
    } catch (e) {
      console.warn('Could not save current view:', e);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

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
    setChatRecipientId(prod.farmerId);
    setChatProductId(prod.id);
    setSelectedProduct(null);
    setCurrentView('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Direct contact farmer from user profile
  const handleContactFarmerFromUser = (farmer: User) => {
    setChatRecipientId(farmer.id);
    setChatProductId(null);
    setCurrentView('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Contact farmer/buyer from order
  const handleContactFromOrder = (farmerId: string, orderId?: string) => {
    setChatRecipientId(farmerId);
    setCurrentView('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Notification action handler
  const handleSelectNotification = (notif: AppNotification) => {
    setIsNotificationsOpen(false);
    if (notif.type === 'order') {
      setCurrentView('orders');
    } else if (notif.type === 'message') {
      setCurrentView('messages');
    } else if (notif.type === 'inventory' && user?.role === 'farmer') {
      setCurrentView('farmer_dashboard');
    }
  };

  return (
    <AndroidDeviceShell
      onOpenInstallModal={() => setIsInstallModalOpen(true)}
      isAndroidView={isAndroidView}
      setIsAndroidView={setIsAndroidView}
    >
      <div className="min-h-screen bg-[#F4F7F5] text-[#1A2E1A] font-sans flex flex-col selection:bg-green-600 selection:text-white pb-20 md:pb-0">
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
          onOpenCart={() => setIsCheckoutOpen(true)}
          onOpenAddProduct={() => {
            setEditingProduct(null);
            setIsAddProductOpen(true);
          }}
          onOpenInstallApp={() => setIsInstallModalOpen(true)}
        />

      {/* Main Application Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {currentView === 'marketplace' && (
          <Marketplace
            onSelectProduct={setSelectedProduct}
            onSelectFarmer={handleSelectFarmer}
          />
        )}

        {currentView === 'farmer_dashboard' && (
          <FarmerDashboard
            key={`farmer-dash-${farmerRefreshKey}`}
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
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'buyer_dashboard' && (
          <BuyerDashboard
            onNavigate={handleNavigate}
            onSelectProduct={setSelectedProduct}
          />
        )}

        {currentView === 'admin' && <AdminDashboard />}

        {currentView === 'orders' && (
          <OrderManagement
            initialSelectedOrder={selectedOrderForTracking}
            onContactFarmer={handleContactFromOrder}
            onOpenReviewModal={setReviewOrder}
          />
        )}

        {currentView === 'messages' && (
          <MessagingHub
            initialRecipientId={chatRecipientId}
            initialProductId={chatProductId}
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

      {/* Trust & Local Agriculture Guarantee Strip */}
      <section className="bg-white border-y border-stone-200 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Direct Farm-Gate Transparency</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Support local agriculture directly. Every dollar goes straight to the hardworking farming families producing your food.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Verified Producers & Quality</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Every farmer profile is verified. Access authentic harvest dates, farming methods, and real customer reviews.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Flexible Farm Gate or Delivery</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Choose free on-farm collection to visit the growers in person, or enjoy reliable local doorstep delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Application Footer */}
      <footer className="bg-stone-900 text-stone-400 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-white text-lg tracking-tight">agroX</span>
              </div>
              <p className="text-stone-400 text-xs max-w-md leading-relaxed">
                Empowering smallholder and commercial farmers with a modern digital marketplace to connect directly with consumers, restaurants, and wholesale buyers across Zimbabwe and regional agricultural hubs.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider">Navigation</h5>
              <ul className="space-y-1.5 text-stone-400">
                <li><button onClick={() => handleNavigate('marketplace')} className="hover:text-emerald-400 transition-colors">Marketplace Browse</button></li>
                <li><button onClick={() => handleNavigate('buyer_dashboard')} className="hover:text-emerald-400 transition-colors">Buyer Hub</button></li>
                <li><button onClick={() => handleNavigate('farmer_dashboard')} className="hover:text-emerald-400 transition-colors">Farmer Portal</button></li>
                <li><button onClick={() => handleNavigate('orders')} className="hover:text-emerald-400 transition-colors">Order Tracking</button></li>
                <li>
                  <button
                    id="footer-nav-admin-btn"
                    onClick={() => setIsAdminAccessOpen(true)}
                    className="text-stone-400 hover:text-purple-400 transition-colors flex items-center gap-1.5 font-medium pt-1"
                  >
                    <Lock className="w-3 h-3 text-purple-400" />
                    <span>Admin Access</span>
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider">Contact & Support</h5>
              <div className="space-y-1.5 text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-500" />
                  <span>+263 77 123 4567</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-500" />
                  <span>support@agrox.market</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-500" />
                  <span>Harare & Provincial Hubs</span>
                </div>
              </div>

              {/* Prominent Footer Admin Access Button */}
              <div className="pt-2">
                <button
                  id="footer-admin-access-btn"
                  onClick={() => setIsAdminAccessOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-purple-950 text-stone-200 hover:text-white border border-stone-700/80 text-xs font-bold transition-all shadow-xs cursor-pointer group"
                >
                  <Lock className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
                  <span>Admin Access Portal</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500 text-[11px]">
            <div>© {new Date().getFullYear()} agroX Digital Agricultural Marketplace. All rights reserved.</div>
            <div className="flex items-center gap-4 flex-wrap">
              <span>Fair Trade</span>
              <span>•</span>
              <span>Organic Standards</span>
              <span>•</span>
              <span>Direct Agriculture</span>
              <span>•</span>
              <button
                id="footer-bottom-admin-access-link"
                onClick={() => setIsAdminAccessOpen(true)}
                className="text-stone-400 hover:text-purple-400 transition-colors flex items-center gap-1 font-semibold"
              >
                <ShieldCheck className="w-3 h-3 text-purple-400" />
                <span>Admin Sign In</span>
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

      {isCheckoutOpen && (
        <CheckoutModal
          onClose={() => setIsCheckoutOpen(false)}
          onOrderSuccess={(order) => {
            setIsCheckoutOpen(false);
            setSelectedOrderForTracking(order);
            setCurrentView('orders');
          }}
        />
      )}

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSuccess={() => {
            setReviewOrder(null);
            setCurrentView('orders');
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
          onClose={() => setIsAuthOpen(false)}
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

      {/* Android Material 3 Bottom Navigation Bar */}
      <AndroidBottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenCart={() => setIsCheckoutOpen(true)}
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
    </div>
  </AndroidDeviceShell>
);
}
export default App;
