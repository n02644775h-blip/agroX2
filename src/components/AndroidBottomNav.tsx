import React from 'react';
import {
  Store,
  FileText,
  MessageSquare,
  Bell,
  User,
  Plus,
  ShoppingCart,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface AndroidBottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenNotifications: () => void;
  onOpenCart: () => void;
  onOpenAddProduct?: () => void;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenNotifications,
  onOpenCart,
  onOpenAddProduct
}) => {
  const { user, unreadNotifsCount, unreadMessagesCount } = useAuth();
  const { totalItems } = useCart();

  const isFarmer = user?.role === 'farmer';
  const isAdmin = user?.role === 'admin';

  const getPortalView = () => {
    if (isFarmer) return 'farmer_dashboard';
    if (isAdmin) return 'admin';
    return 'buyer_dashboard';
  };

  const portalViewName = isFarmer ? 'farmer_dashboard' : isAdmin ? 'admin' : 'buyer_dashboard';
  const isPortalActive = currentView === portalViewName || currentView === 'farm_profile';

  return (
    <>
      {/* Android Floating Action Button (FAB) */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 md:hidden">
        {/* Cart FAB for Buyers */}
        {!isFarmer && !isAdmin && (
          <button
            id="android-fab-cart"
            onClick={onOpenCart}
            className="relative w-14 h-14 rounded-2xl bg-green-700 hover:bg-green-800 text-white shadow-xl shadow-green-900/30 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Open Shopping Cart"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 text-stone-900 font-extrabold text-xs rounded-full flex items-center justify-center border-2 border-white shadow-md">
                {totalItems}
              </span>
            )}
          </button>
        )}

        {/* Add Produce FAB for Farmers */}
        {isFarmer && onOpenAddProduct && (
          <button
            id="android-fab-add-produce"
            onClick={onOpenAddProduct}
            className="w-14 h-14 rounded-2xl bg-green-700 hover:bg-green-800 text-white shadow-xl shadow-green-900/30 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Add Produce Listing"
          >
            <Plus className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* Android Material 3 Bottom Navigation Bar */}
      <nav
        id="android-bottom-navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-gray-200 px-2 pt-1.5 pb-safe md:hidden shadow-lg"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center justify-around h-14">
          {/* Market Tab */}
          <button
            id="android-nav-marketplace"
            onClick={() => onNavigate('marketplace')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              currentView === 'marketplace' ? 'text-green-800' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                currentView === 'marketplace' ? 'bg-green-100 text-green-800' : 'text-gray-500'
              }`}
            >
              <Store className="w-5 h-5" />
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${currentView === 'marketplace' ? 'font-bold' : 'font-medium'}`}>
              Market
            </span>
          </button>

          {/* Orders Tab */}
          <button
            id="android-nav-orders"
            onClick={() => onNavigate('orders')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              currentView === 'orders' ? 'text-green-800' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <div
              className={`relative w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                currentView === 'orders' ? 'bg-green-100 text-green-800' : 'text-gray-500'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${currentView === 'orders' ? 'font-bold' : 'font-medium'}`}>
              Orders
            </span>
          </button>

          {/* Messages Tab */}
          <button
            id="android-nav-messages"
            onClick={() => onNavigate('messages')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              currentView === 'messages' ? 'text-green-800' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <div
              className={`relative w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                currentView === 'messages' ? 'bg-green-100 text-green-800' : 'text-gray-500'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-0 right-2 w-4 h-4 bg-green-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${currentView === 'messages' ? 'font-bold' : 'font-medium'}`}>
              Chat
            </span>
          </button>

          {/* Alerts Tab */}
          <button
            id="android-nav-alerts"
            onClick={onOpenNotifications}
            className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 text-gray-500 hover:text-gray-800"
          >
            <div className="relative w-12 h-7 rounded-full flex items-center justify-center transition-all">
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-0 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {unreadNotifsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none font-medium">
              Alerts
            </span>
          </button>

          {/* Profile / Portal Tab */}
          <button
            id="android-nav-portal"
            onClick={() => onNavigate(getPortalView())}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              isPortalActive ? 'text-green-800' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                isPortalActive ? 'bg-green-100 text-green-800' : 'text-gray-500'
              }`}
            >
              {isFarmer ? (
                <LayoutDashboard className="w-5 h-5" />
              ) : isAdmin ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${isPortalActive ? 'font-bold' : 'font-medium'}`}>
              {isFarmer ? 'Farm Hub' : isAdmin ? 'Admin' : 'Buyer Hub'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
