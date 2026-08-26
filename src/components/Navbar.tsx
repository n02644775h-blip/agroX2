import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  Sprout,
  ShoppingBag,
  MessageSquare,
  Bell,
  Heart,
  User,
  PlusCircle,
  Menu,
  X,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
  Store,
  FileText,
  LogOut,
  Sparkles,
  MapPin,
  Smartphone,
  Download
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, data?: any) => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onOpenAddProduct?: () => void;
  onOpenNotifications?: () => void;
  onOpenCart?: () => void;
  onOpenInstallApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenAddProduct,
  onOpenNotifications,
  onOpenCart,
  onOpenInstallApp
}) => {
  const { user, logout, switchDemoRole, unreadNotifsCount, unreadMessagesCount } = useAuth();
  const { totalItems, openCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);

  const handleNav = (view: string, data?: any) => {
    onNavigate(view, data);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setDemoDropdownOpen(false);
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'farmer') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Sprout className="w-3 h-3 text-emerald-600" />
          Farmer
        </span>
      );
    }
    if (user.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
        <ShoppingBag className="w-3 h-3 text-amber-600" />
        Buyer
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="navbar-brand-logo"
              onClick={() => handleNav('marketplace')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xs group-hover:bg-green-700 transition-colors">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-green-800 block leading-none">
                agroX
              </span>
            </button>
            <div className="hidden lg:block">
              {getRoleBadge()}
            </div>
          </div>

          {/* Role / Portal Switcher Pill (from Professional Polish design) */}
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1 shrink-0">
            <button
              id="nav-pill-buyer"
              onClick={() => handleNav(user?.role === 'buyer' ? 'buyer_dashboard' : 'marketplace')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentView === 'marketplace' || currentView === 'buyer_dashboard' || currentView === 'favorites'
                  ? 'bg-white shadow-xs text-green-700'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Buyer View
            </button>
            <button
              id="nav-pill-farmer"
              onClick={() => {
                if (user?.role !== 'farmer') {
                  switchDemoRole('farmer-1');
                }
                handleNav('farmer_dashboard');
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentView === 'farmer_dashboard' || currentView === 'farm_profile'
                  ? 'bg-white shadow-xs text-green-700'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Farmer Portal
            </button>
            {user?.role === 'admin' ? (
              <button
                id="nav-pill-admin"
                onClick={() => handleNav('admin')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentView === 'admin'
                    ? 'bg-white shadow-xs text-purple-700'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Admin
              </button>
            ) : null}
          </div>

          {/* Main Action Links */}
          <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold text-gray-600">
            <button
              id="nav-marketplace-btn"
              onClick={() => handleNav('marketplace')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentView === 'marketplace'
                  ? 'bg-green-50 text-green-700 font-bold'
                  : 'hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Marketplace
            </button>

            {user && (
              <button
                id="nav-orders-btn"
                onClick={() => handleNav('orders')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentView === 'orders'
                    ? 'bg-green-50 text-green-700 font-bold'
                    : 'hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Orders
              </button>
            )}

            {user?.role === 'buyer' && (
              <button
                id="nav-favorites-btn"
                onClick={() => handleNav('favorites')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentView === 'favorites'
                    ? 'bg-green-50 text-green-700 font-bold'
                    : 'hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                Favorites
              </button>
            )}
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                id="demo-switcher-btn"
                onClick={() => setDemoDropdownOpen(!demoDropdownOpen)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                title="Switch demo user role for testing"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Switch Role</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {demoDropdownOpen && (
                <div
                  id="demo-switcher-menu"
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Quick Role Selector
                  </div>
                  <button
                    id="demo-farmer-tendai"
                    onClick={() => {
                      switchDemoRole('farmer-1');
                      setDemoDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 flex items-center gap-2.5 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                      TM
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Tendai Moyo (Farmer)</div>
                      <div className="text-[10px] text-gray-500">GreenFields Farm • Marondera</div>
                    </div>
                  </button>

                  <button
                    id="demo-farmer-chipo"
                    onClick={() => {
                      switchDemoRole('farmer-2');
                      setDemoDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 flex items-center gap-2.5 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                      CS
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Chipo Sibanda (Farmer)</div>
                      <div className="text-[10px] text-gray-500">Sunrise Poultry • Gweru</div>
                    </div>
                  </button>

                  <button
                    id="demo-buyer-grace"
                    onClick={() => {
                      switchDemoRole('buyer-1');
                      setDemoDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      GC
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Grace Chidzero (Buyer)</div>
                      <div className="text-[10px] text-gray-500">Household Buyer • Harare</div>
                    </div>
                  </button>

                  <button
                    id="demo-admin"
                    onClick={() => {
                      switchDemoRole('admin-1');
                      setDemoDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 flex items-center gap-2.5 transition-colors border-t border-gray-100"
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                      AD
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Admin Sarah</div>
                      <div className="text-[10px] text-gray-500">Platform Management</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Farmer Add Product Button */}
            {user?.role === 'farmer' && (
              <button
                id="navbar-add-product-btn"
                onClick={onOpenAddProduct}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Produce</span>
              </button>
            )}

            {/* Messages Icon */}
            {user && (
              <button
                id="navbar-messages-btn"
                onClick={() => handleNav('messages')}
                className={`relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
                  currentView === 'messages' ? 'bg-gray-100 text-green-700' : ''
                }`}
                title="Messages"
                aria-label="Messages"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications Icon */}
            {user && (
              <button
                id="navbar-notifications-btn"
                onClick={() => {
                  if (onOpenNotifications) {
                    onOpenNotifications();
                  } else {
                    handleNav('notifications');
                  }
                }}
                className={`relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
                  currentView === 'notifications' ? 'bg-gray-100 text-green-700' : ''
                }`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full font-bold">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>
            )}

            {/* Buyer Cart Trigger */}
            <button
              id="navbar-cart-btn"
              onClick={() => {
                if (onOpenCart) {
                  onOpenCart();
                } else {
                  openCart();
                }
              }}
              className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Install Android App Trigger (Desktop/Tablet) */}
            {onOpenInstallApp && (
              <button
                id="navbar-install-app-btn"
                onClick={onOpenInstallApp}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-green-800 hover:bg-green-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                title="Install Android Application"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android App</span>
              </button>
            )}

            {/* User Profile / Auth Actions with Professional Polish layout */}
            {user ? (
              <div className="relative border-l pl-3 sm:pl-4 border-gray-200">
                <button
                  id="navbar-user-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-gray-50 transition-all text-left"
                  aria-label="User menu"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold leading-none text-gray-900">{user.name}</p>
                    <p className="text-[10px] text-gray-500 mt-1 capitalize font-medium">
                      {user.role === 'farmer' ? 'Verified Producer' : user.role === 'admin' ? 'Platform Admin' : 'Active Buyer'}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-green-100 border-2 border-green-500 overflow-hidden flex items-center justify-center shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-green-200 font-bold text-green-700 text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div
                    id="user-dropdown-menu"
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="font-bold text-gray-900 text-xs truncate">{user.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
                      <div className="text-[10px] text-green-700 font-semibold mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {user.location.city}, {user.location.province}
                      </div>
                    </div>

                    {user.role === 'farmer' && (
                      <button
                        onClick={() => handleNav('farmer_dashboard')}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                      >
                        <LayoutDashboard className="w-4 h-4 text-green-600" />
                        Farmer Portal
                      </button>
                    )}

                    {user.role === 'buyer' && (
                      <button
                        onClick={() => handleNav('buyer_dashboard')}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-600" />
                        Buyer Hub
                      </button>
                    )}

                    {user.role === 'admin' && (
                      <button
                        onClick={() => handleNav('admin')}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        Admin Portal
                      </button>
                    )}

                    <button
                      onClick={() => handleNav('orders')}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      Orders & History
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      id="navbar-logout-btn"
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                <button
                  id="navbar-login-btn"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Log In
                </button>
                <button
                  id="navbar-register-btn"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-xs transition-colors"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              id="navbar-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="Open mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-gray-700" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Navigation</div>
            {getRoleBadge()}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleNav('marketplace')}
              className="flex items-center gap-2 p-2.5 rounded-lg text-xs text-gray-700 bg-gray-50 hover:bg-green-50 hover:text-green-700 font-semibold"
            >
              <Store className="w-4 h-4 text-green-600" />
              Marketplace
            </button>

            {user?.role === 'farmer' ? (
              <button
                onClick={() => handleNav('farmer_dashboard')}
                className="flex items-center gap-2 p-2.5 rounded-lg text-xs text-gray-700 bg-gray-50 hover:bg-green-50 hover:text-green-700 font-semibold"
              >
                <LayoutDashboard className="w-4 h-4 text-green-600" />
                Farmer Portal
              </button>
            ) : user?.role === 'admin' ? (
              <button
                onClick={() => handleNav('admin')}
                className="flex items-center gap-2 p-2.5 rounded-lg text-xs text-gray-700 bg-gray-50 hover:bg-purple-50 hover:text-purple-700 font-semibold"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Admin Portal
              </button>
            ) : (
              <button
                onClick={() => handleNav('buyer_dashboard')}
                className="flex items-center gap-2 p-2.5 rounded-lg text-xs text-gray-700 bg-gray-50 hover:bg-amber-50 hover:text-amber-700 font-semibold"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-600" />
                Buyer Hub
              </button>
            )}

            <button
              onClick={() => handleNav('orders')}
              className="flex items-center gap-2 p-2.5 rounded-lg text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 font-semibold"
            >
              <FileText className="w-4 h-4 text-gray-500" />
              Orders
            </button>

            <button
              onClick={() => handleNav('messages')}
              className="flex items-center gap-2 p-2.5 rounded-lg text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 font-semibold"
            >
              <MessageSquare className="w-4 h-4 text-gray-500" />
              Messages
            </button>
          </div>

          {/* Android App Direct Install Option in Mobile Drawer */}
          {onOpenInstallApp && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenInstallApp();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-green-800 text-white flex items-center justify-between text-xs font-bold shadow-xs hover:bg-green-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-green-300" />
                <span>Get agroX Android App</span>
              </span>
              <span className="text-[10px] bg-green-700 text-green-100 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <Download className="w-3 h-3" />
                APK / PWA
              </span>
            </button>
          )}

          {/* Mobile Switch Role Actions */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Switch Test Account:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { switchDemoRole('farmer-1'); setMobileMenuOpen(false); }}
                className="px-2.5 py-1 text-xs rounded-md bg-green-50 text-green-800 border border-green-200 font-medium"
              >
                Farmer Tendai
              </button>
              <button
                onClick={() => { switchDemoRole('farmer-2'); setMobileMenuOpen(false); }}
                className="px-2.5 py-1 text-xs rounded-md bg-green-50 text-green-800 border border-green-200 font-medium"
              >
                Farmer Chipo
              </button>
              <button
                onClick={() => { switchDemoRole('buyer-1'); setMobileMenuOpen(false); }}
                className="px-2.5 py-1 text-xs rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium"
              >
                Buyer Grace
              </button>
              <button
                onClick={() => { switchDemoRole('admin-1'); setMobileMenuOpen(false); }}
                className="px-2.5 py-1 text-xs rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-medium"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

