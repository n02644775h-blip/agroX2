import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { isSellerRole } from '../types';
import {
  Sprout,
  ShoppingBag,
  MessageSquare,
  Bell,
  Heart,
  PlusCircle,
  Menu,
  X,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
  Store,
  FileText,
  LogOut,
  MapPin,
  Smartphone,
  Megaphone,
  Settings,
  Search,
  Users,
  ClipboardList
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, data?: any) => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onOpenAddProduct?: () => void;
  onOpenNotifications?: () => void;
  onOpenCart?: () => void;
  onOpenInstallApp?: () => void;
  onOpenSettings?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  onScrollToSection?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenAddProduct,
  onOpenNotifications,
  onOpenCart,
  onOpenInstallApp,
  onOpenSettings,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onScrollToSection
}) => {
  const { user, logout, unreadNotifsCount, unreadMessagesCount } = useAuth();
  const { totalItems, openCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (view: string, data?: any) => {
    onNavigate(view, data);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const handleSectionLink = (sectionId: string) => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    if (onScrollToSection) {
      onScrollToSection(sectionId);
    } else {
      onNavigate('marketplace', { scrollTo: sectionId });
    }
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = localSearch.trim();
    if (onSearchChange) onSearchChange(trimmed);
    if (onSearchSubmit) {
      onSearchSubmit(trimmed);
    } else {
      handleSectionLink('fresh-from-farmers');
    }
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const getRoleLabel = () => {
    if (!user) return '';
    if (user.role === 'fodder_supplier') return 'Fodder Supplier';
    if (user.role === 'farmer') return 'Farmer';
    if (user.role === 'admin') return 'Administrator';
    return 'Buyer';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8EEE8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 lg:gap-6">
          {/* Left: FarmBridge Brand Mark */}
          <div className="flex items-center gap-6 shrink-0">
            <button
              id="navbar-brand-logo"
              onClick={() => handleNav('marketplace')}
              className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174B35] rounded-lg"
            >
              <div className="w-9 h-9 bg-[#174B35] rounded-xl flex items-center justify-center text-white transition-colors group-hover:bg-[#123c2a]">
                <Sprout className="w-5 h-5" />
              </div>
              <div className="leading-none">
                <span className="text-lg font-bold tracking-tight text-[#202B24] block">
                  FarmBridge
                </span>
                <span className="text-[10px] font-medium text-[#77A987] tracking-wide hidden sm:block">
                  Direct Agricultural Market
                </span>
              </div>
            </button>

            {/* Primary Navigation Links */}
            <nav
              aria-label="Main navigation"
              className="hidden md:flex items-center gap-1 text-[13px] font-medium text-[#202B24]/75"
            >
              <button
                id="nav-marketplace-btn"
                onClick={() => handleNav('marketplace')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  currentView === 'marketplace'
                    ? 'text-[#174B35] font-semibold bg-[#F8FAF7]'
                    : 'hover:text-[#174B35] hover:bg-[#F8FAF7]'
                }`}
              >
                Marketplace
              </button>

              <button
                id="nav-community-btn"
                onClick={() => handleSectionLink('farmbridge-community-section')}
                className="px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 hover:text-[#174B35] hover:bg-[#F8FAF7]"
              >
                Community
              </button>

              <button
                id="nav-buyer-requests-btn"
                onClick={() => handleSectionLink('buyer-requests-section')}
                className="px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 hover:text-[#174B35] hover:bg-[#F8FAF7]"
              >
                Buyer Requests
              </button>

              {isSellerRole(user?.role) && (
                <button
                  id="nav-farmer-portal-btn"
                  onClick={() => handleNav('farmer_dashboard')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'farmer_dashboard' || currentView === 'farm_profile'
                      ? 'text-[#174B35] font-semibold bg-[#F8FAF7]'
                      : 'hover:text-[#174B35] hover:bg-[#F8FAF7]'
                  }`}
                >
                  {user?.role === 'fodder_supplier' ? 'Supplier Hub' : 'Farmer Hub'}
                </button>
              )}

              {user?.role === 'buyer' && (
                <button
                  id="nav-buyer-hub-btn"
                  onClick={() => handleNav('buyer_dashboard')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'buyer_dashboard'
                      ? 'text-[#174B35] font-semibold bg-[#F8FAF7]'
                      : 'hover:text-[#174B35] hover:bg-[#F8FAF7]'
                  }`}
                >
                  Buyer Hub
                </button>
              )}

              {user?.role === 'admin' && (
                <button
                  id="nav-admin-portal-btn"
                  onClick={() => handleNav('admin')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin'
                      ? 'text-[#174B35] font-semibold bg-[#F8FAF7]'
                      : 'hover:text-[#174B35] hover:bg-[#F8FAF7]'
                  }`}
                >
                  Admin
                </button>
              )}

              {user && (
                <button
                  id="nav-orders-btn"
                  onClick={() => handleNav('orders')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'orders'
                      ? 'text-[#174B35] font-semibold bg-[#F8FAF7]'
                      : 'hover:text-[#174B35] hover:bg-[#F8FAF7]'
                  }`}
                >
                  Orders
                </button>
              )}
            </nav>
          </div>

          {/* Center-Right: Compact Desktop Search */}
          <form
            onSubmit={handleSearchFormSubmit}
            className="hidden xl:flex items-center flex-1 max-w-xs relative"
          >
            <Search className="w-4 h-4 text-[#202B24]/45 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (onSearchChange) onSearchChange(e.target.value);
              }}
              placeholder="Search produce, farms..."
              aria-label="Search marketplace"
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#F8FAF7] border border-[#E8EEE8] rounded-xl text-[#202B24] placeholder:text-[#202B24]/45 focus:outline-none focus:bg-white focus:border-[#77A987] transition-colors"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  if (onSearchChange) onSearchChange('');
                  if (onSearchSubmit) onSearchSubmit('');
                }}
                aria-label="Clear search"
                className="absolute right-2.5 text-[#202B24]/45 hover:text-[#202B24]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Right Action Controls (Essential shopping tools always accessible on desktop & mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile & Compact Search Toggle */}
            <button
              type="button"
              id="navbar-search-toggle"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="xl:hidden p-2 rounded-xl text-[#202B24]/75 hover:text-[#174B35] hover:bg-[#F8FAF7] transition-colors"
              title="Search produce"
              aria-label="Search produce"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Seller Quick Add */}
            {isSellerRole(user?.role) && onOpenAddProduct && (
              <button
                id="navbar-add-product-btn"
                onClick={onOpenAddProduct}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#174B35] hover:bg-[#123c2a] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{user?.role === 'fodder_supplier' ? 'Add Fodder' : 'List Produce'}</span>
              </button>
            )}

            {/* Direct Messages */}
            {user && (
              <button
                id="navbar-messages-btn"
                onClick={() => handleNav('messages', { channel: 'direct' })}
                className={`relative p-2 rounded-xl transition-colors ${
                  currentView === 'messages'
                    ? 'bg-[#F8FAF7] text-[#174B35]'
                    : 'text-[#202B24]/75 hover:text-[#174B35] hover:bg-[#F8FAF7]'
                }`}
                title="Messages"
                aria-label="Messages"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#174B35] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications */}
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
                className={`relative p-2 rounded-xl transition-colors ${
                  currentView === 'notifications'
                    ? 'bg-[#F8FAF7] text-[#174B35]'
                    : 'text-[#202B24]/75 hover:text-[#174B35] hover:bg-[#F8FAF7]'
                }`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>
            )}

            {/* Shopping Cart (Always visible on mobile and desktop) */}
            <button
              id="navbar-cart-btn"
              onClick={() => {
                if (onOpenCart) {
                  onOpenCart();
                } else {
                  openCart();
                }
              }}
              className="relative p-2 rounded-xl text-[#202B24]/80 hover:text-[#174B35] hover:bg-[#F8FAF7] transition-colors"
              title="Shopping Cart"
              aria-label={`Shopping Cart (${totalItems} items)`}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#174B35] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Account / Auth Menu */}
            {user ? (
              <div ref={dropdownRef} className="relative pl-1.5 sm:pl-2.5 border-l border-[#E8EEE8]">
                <button
                  id="navbar-user-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F8FAF7] transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174B35]"
                  aria-label="User account menu"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-[#F8FAF7] border border-[#E8EEE8] overflow-hidden flex items-center justify-center shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-[#174B35] text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left leading-tight max-w-[110px]">
                    <p className="text-xs font-semibold text-[#202B24] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#77A987] font-medium truncate">{getRoleLabel()}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#202B24]/45 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div
                    id="user-dropdown-menu"
                    className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-lg border border-[#E8EEE8] py-2 z-50"
                  >
                    <div className="px-4 py-2.5 border-b border-[#E8EEE8]">
                      <div className="font-semibold text-[#202B24] text-xs truncate">{user.name}</div>
                      <div className="text-[11px] text-[#202B24]/60 truncate">{user.email}</div>
                      <div className="text-[11px] text-[#174B35] font-medium mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {user.location.city}, {user.location.province}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      {isSellerRole(user.role) && (
                        <button
                          onClick={() => handleNav('farmer_dashboard')}
                          className="w-full text-left px-4 py-2 text-xs text-[#202B24] hover:bg-[#F8FAF7] flex items-center gap-2.5 font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#174B35]" />
                          {user.role === 'fodder_supplier' ? 'Fodder Supplier Portal' : 'Farmer Portal'}
                        </button>
                      )}

                      {user.role === 'buyer' && (
                        <button
                          onClick={() => handleNav('buyer_dashboard')}
                          className="w-full text-left px-4 py-2 text-xs text-[#202B24] hover:bg-[#F8FAF7] flex items-center gap-2.5 font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#174B35]" />
                          Buyer Hub
                        </button>
                      )}

                      {user.role === 'admin' && (
                        <button
                          onClick={() => handleNav('admin')}
                          className="w-full text-left px-4 py-2 text-xs text-[#202B24] hover:bg-[#F8FAF7] flex items-center gap-2.5 font-medium"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#174B35]" />
                          Admin Portal
                        </button>
                      )}

                      <button
                        onClick={() => handleNav('orders')}
                        className="w-full text-left px-4 py-2 text-xs text-[#202B24] hover:bg-[#F8FAF7] flex items-center gap-2.5 font-medium"
                      >
                        <FileText className="w-4 h-4 text-[#202B24]/60" />
                        Orders & History
                      </button>

                      {user.role === 'buyer' && (
                        <button
                          onClick={() => handleNav('favorites')}
                          className="w-full text-left px-4 py-2 text-xs text-[#202B24] hover:bg-[#F8FAF7] flex items-center gap-2.5 font-medium"
                        >
                          <Heart className="w-4 h-4 text-[#202B24]/60" />
                          Saved Produce
                        </button>
                      )}

                      <button
                        onClick={() => handleNav('messages', { channel: 'announcements' })}
                        className="w-full text-left px-4 py-2 text-xs text-[#202B24] hover:bg-[#F8FAF7] flex items-center gap-2.5 font-medium"
                      >
                        <Megaphone className="w-4 h-4 text-[#202B24]/60" />
                        Announcements
                      </button>

                      {onOpenSettings && (
                        <button
                          id="navbar-user-settings-btn"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenSettings();
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-[#202B24] hover:bg-[#F8FAF7] flex items-center gap-2.5 font-medium"
                        >
                          <Settings className="w-4 h-4 text-[#202B24]/60" />
                          User Settings
                        </button>
                      )}

                      {onOpenInstallApp && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenInstallApp();
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-[#202B24] hover:bg-[#F8FAF7] flex items-center gap-2.5 font-medium"
                        >
                          <Smartphone className="w-4 h-4 text-[#202B24]/60" />
                          Android App
                        </button>
                      )}
                    </div>

                    <div className="border-t border-[#E8EEE8] mt-1 pt-1">
                      <button
                        id="navbar-logout-btn"
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2.5 border-l border-[#E8EEE8]">
                <button
                  id="navbar-login-btn"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-[#202B24] hover:text-[#174B35] rounded-xl hover:bg-[#F8FAF7] transition-colors whitespace-nowrap"
                >
                  Log In
                </button>
                <button
                  id="navbar-register-btn"
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold text-white bg-[#174B35] hover:bg-[#123c2a] rounded-xl transition-colors whitespace-nowrap"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              id="navbar-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#202B24]/75 hover:bg-[#F8FAF7] md:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expandable Search Bar (Mobile / Tablet / Compact Desktop) */}
        {mobileSearchOpen && (
          <form
            onSubmit={handleSearchFormSubmit}
            className="xl:hidden pb-3 pt-1 border-t border-[#E8EEE8] flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#202B24]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (onSearchChange) onSearchChange(e.target.value);
                }}
                placeholder="Search fresh produce, fodder, or farms..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAF7] border border-[#E8EEE8] rounded-xl text-[#202B24] focus:outline-none focus:bg-white focus:border-[#77A987]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#174B35] text-white text-xs font-semibold rounded-xl shrink-0"
            >
              Search
            </button>
          </form>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu-drawer"
          className="md:hidden border-t border-[#E8EEE8] bg-white px-4 pt-3 pb-6 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleNav('marketplace')}
              className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] hover:border-[#77A987] border border-[#E8EEE8] font-semibold text-left"
            >
              <Store className="w-4 h-4 text-[#174B35] shrink-0" />
              <span>Marketplace</span>
            </button>

            <button
              onClick={() => handleSectionLink('farmbridge-community-section')}
              className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] border border-[#E8EEE8] font-semibold text-left"
            >
              <Users className="w-4 h-4 text-[#174B35] shrink-0" />
              <span>Community</span>
            </button>

            <button
              onClick={() => handleSectionLink('buyer-requests-section')}
              className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] border border-[#E8EEE8] font-semibold text-left"
            >
              <ClipboardList className="w-4 h-4 text-[#174B35] shrink-0" />
              <span>Buyer Requests</span>
            </button>

            {isSellerRole(user?.role) ? (
              <button
                onClick={() => handleNav('farmer_dashboard')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] border border-[#E8EEE8] font-semibold text-left"
              >
                <LayoutDashboard className="w-4 h-4 text-[#174B35] shrink-0" />
                <span>{user?.role === 'fodder_supplier' ? 'Supplier Hub' : 'Farmer Hub'}</span>
              </button>
            ) : user?.role === 'admin' ? (
              <button
                onClick={() => handleNav('admin')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] border border-[#E8EEE8] font-semibold text-left"
              >
                <ShieldCheck className="w-4 h-4 text-[#174B35] shrink-0" />
                <span>Admin Portal</span>
              </button>
            ) : (
              <button
                onClick={() => (user ? handleNav('buyer_dashboard') : onOpenAuth('login'))}
                className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] border border-[#E8EEE8] font-semibold text-left"
              >
                <LayoutDashboard className="w-4 h-4 text-[#174B35] shrink-0" />
                <span>Buyer Hub</span>
              </button>
            )}

            {user && (
              <>
                <button
                  onClick={() => handleNav('orders')}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] border border-[#E8EEE8] font-semibold text-left"
                >
                  <FileText className="w-4 h-4 text-[#174B35] shrink-0" />
                  <span>Orders</span>
                </button>

                <button
                  onClick={() => handleNav('messages', { channel: 'direct' })}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] border border-[#E8EEE8] font-semibold text-left"
                >
                  <MessageSquare className="w-4 h-4 text-[#174B35] shrink-0" />
                  <span>Messages</span>
                </button>
              </>
            )}
          </div>

          {!user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('register');
              }}
              className="w-full py-2.5 rounded-xl bg-[#174B35] text-white text-xs font-semibold"
            >
              Create Account
            </button>
          )}

          {user && onOpenSettings && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs text-[#202B24] bg-[#F8FAF7] border border-[#E8EEE8] font-semibold"
            >
              <Settings className="w-4 h-4 text-[#202B24]/65" />
              <span>User Settings</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
