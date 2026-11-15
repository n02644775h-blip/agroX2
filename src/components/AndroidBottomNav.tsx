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
import { isSellerRole } from '../types';

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

  const isFarmer = isSellerRole(user?.role);
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
      {/* Liquid Glass Floating Action Button (FAB) */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 md:hidden">
        {!isFarmer && !isAdmin && (
          <button
            id="android-fab-cart"
            onClick={onOpenCart}
            className="relative w-14 h-14 rounded-2xl lg-cta-lime text-[#062B1F] shadow-xl flex items-center justify-center active:scale-95 transition-all border border-white/60"
            aria-label="Open Shopping Cart"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#062B1F] text-[#A8E635] font-extrabold text-xs rounded-full flex items-center justify-center border-2 border-white shadow-md tabular-nums">
                {totalItems}
              </span>
            )}
          </button>
        )}

        {isFarmer && onOpenAddProduct && (
          <button
            id="android-fab-add-produce"
            onClick={onOpenAddProduct}
            className="w-14 h-14 rounded-2xl lg-cta-lime text-[#062B1F] shadow-xl flex items-center justify-center active:scale-95 transition-all border border-white/60"
            aria-label="Add Produce Listing"
          >
            <Plus className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* Liquid Glass Bottom Navigation Bar */}
      <nav
        id="android-bottom-navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#062B1F]/92 backdrop-blur-2xl border-t border-white/15 px-2 pt-1.5 pb-safe md:hidden shadow-[0_-10px_30px_rgba(6,43,31,0.35)]"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center justify-around h-14">
          <button
            id="android-nav-marketplace"
            onClick={() => onNavigate('marketplace')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              currentView === 'marketplace' ? 'text-[#A8E635]' : 'text-[#DFF4E4]/70 hover:text-white'
            }`}
          >
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                currentView === 'marketplace' ? 'bg-[#A8E635] text-[#062B1F] shadow-xs' : 'text-[#DFF4E4]/75'
              }`}
            >
              <Store className="w-4 h-4" />
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${currentView === 'marketplace' ? 'font-bold' : 'font-medium'}`}>
              Market
            </span>
          </button>

          <button
            id="android-nav-orders"
            onClick={() => onNavigate('orders')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              currentView === 'orders' ? 'text-[#A8E635]' : 'text-[#DFF4E4]/70 hover:text-white'
            }`}
          >
            <div
              className={`relative w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                currentView === 'orders' ? 'bg-[#A8E635] text-[#062B1F] shadow-xs' : 'text-[#DFF4E4]/75'
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${currentView === 'orders' ? 'font-bold' : 'font-medium'}`}>
              Orders
            </span>
          </button>

          <button
            id="android-nav-messages"
            onClick={() => onNavigate('messages')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              currentView === 'messages' ? 'text-[#A8E635]' : 'text-[#DFF4E4]/70 hover:text-white'
            }`}
          >
            <div
              className={`relative w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                currentView === 'messages' ? 'bg-[#A8E635] text-[#062B1F] shadow-xs' : 'text-[#DFF4E4]/75'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 bg-[#A8E635] text-[#062B1F] text-[9px] font-extrabold rounded-full flex items-center justify-center tabular-nums">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${currentView === 'messages' ? 'font-bold' : 'font-medium'}`}>
              Chat
            </span>
          </button>

          <button
            id="android-nav-alerts"
            onClick={onOpenNotifications}
            className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 text-[#DFF4E4]/70 hover:text-white"
          >
            <div className="relative w-12 h-7 rounded-full flex items-center justify-center transition-all">
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 bg-[#F4D35E] text-[#062B1F] text-[9px] font-extrabold rounded-full flex items-center justify-center tabular-nums">
                  {unreadNotifsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none font-medium">
              Alerts
            </span>
          </button>

          <button
            id="android-nav-portal"
            onClick={() => onNavigate(getPortalView())}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              isPortalActive ? 'text-[#A8E635]' : 'text-[#DFF4E4]/70 hover:text-white'
            }`}
          >
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                isPortalActive ? 'bg-[#A8E635] text-[#062B1F] shadow-xs' : 'text-[#DFF4E4]/75'
              }`}
            >
              {isFarmer ? (
                <LayoutDashboard className="w-4 h-4" />
              ) : isAdmin ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${isPortalActive ? 'font-bold' : 'font-medium'}`}>
              {user?.role === 'fodder_supplier' ? 'Fodder Hub' : isFarmer ? 'Farm Hub' : isAdmin ? 'Admin' : 'Buyer Hub'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
