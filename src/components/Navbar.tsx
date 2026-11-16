import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { isSellerRole } from '../types';
import {
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
  onOpenSettings,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onScrollToSection
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { user, logout, unreadNotifsCount, unreadMessagesCount } = useAuth();
  const { totalItems, openCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [activeAnchor, setActiveAnchor] = useState<string>('marketplace');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (currentView !== 'marketplace') {
      setActiveAnchor(currentView);
    } else if (!['community', 'requests'].includes(activeAnchor)) {
      setActiveAnchor('marketplace');
    }
  }, [currentView]);

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
    setActiveAnchor(view);
    onNavigate(view, data);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const handleSectionLink = (sectionId: string, anchorKey: string) => {
    setActiveAnchor(anchorKey);
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
      handleSectionLink('fresh-from-farmers', 'marketplace');
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

  const renderNavPill = (isActive: boolean) =>
    isActive ? (
      <motion.span
        layoutId={prefersReducedMotion ? undefined : 'navbar-liquid-pill'}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="absolute inset-0 rounded-full bg-linear-to-r from-[#A8E635]/95 via-[#7AC92D]/95 to-[#145A38] border border-white/55 shadow-sm shadow-[#A8E635]/30"
      />
    ) : null;

  return (
    <header className="sticky top-0 z-40 bg-[#062B1F]/86 backdrop-blur-2xl border-b border-white/15 shadow-[0_12px_32px_-14px_rgba(6,43,31,0.65)] text-white">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-2 lg:gap-5">
          {/* Left: FarmBridge Brand Mark */}
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 shrink-0 min-w-0">
            <button
              type="button"
              id="navbar-brand-logo"
              onClick={() => handleNav('marketplace')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8E635] rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <img
                  src="/assets/farmbridge-logo-white.png"
                  alt="FarmBridge logo"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <div className="leading-none">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-white block">
                  FarmBridge<span className="text-[#A8E635]">.</span>
                </span>
                <span className="text-[10px] font-medium text-[#DFF4E4]/75 tracking-wide hidden sm:block">
                  Direct Agricultural Market
                </span>
              </div>
            </button>

            {/* Primary Translucent Pill Navigation */}
            <nav
              aria-label="Main navigation"
              className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/8 border border-white/12 text-[13px] font-medium"
            >
              <button
                type="button"
                id="nav-marketplace-btn"
                onClick={() => handleNav('marketplace')}
                className={`relative px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'marketplace' && activeAnchor === 'marketplace'
                    ? 'text-[#062B1F] font-bold'
                    : 'text-[#DFF4E4]/85 hover:text-white'
                }`}
              >
                {renderNavPill(currentView === 'marketplace' && activeAnchor === 'marketplace')}
                <span className="relative z-10">Marketplace</span>
              </button>

              <button
                type="button"
                id="nav-community-btn"
                onClick={() => handleSectionLink('farmbridge-community-section', 'community')}
                className={`relative px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'marketplace' && activeAnchor === 'community'
                    ? 'text-[#062B1F] font-bold'
                    : 'text-[#DFF4E4]/85 hover:text-white'
                }`}
              >
                {renderNavPill(currentView === 'marketplace' && activeAnchor === 'community')}
                <span className="relative z-10">Community</span>
              </button>

              <button
                type="button"
                id="nav-buyer-requests-btn"
                onClick={() => handleSectionLink('buyer-requests-section', 'requests')}
                className={`relative px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'marketplace' && activeAnchor === 'requests'
                    ? 'text-[#062B1F] font-bold'
                    : 'text-[#DFF4E4]/85 hover:text-white'
                }`}
              >
                {renderNavPill(currentView === 'marketplace' && activeAnchor === 'requests')}
                <span className="relative z-10">Buyer Requests</span>
              </button>

              {isSellerRole(user?.role) && (
                <button
                  type="button"
                  id="nav-farmer-portal-btn"
                  onClick={() => handleNav('farmer_dashboard')}
                  className={`relative px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentView === 'farmer_dashboard' || currentView === 'farm_profile'
                      ? 'text-[#062B1F] font-bold'
                      : 'text-[#DFF4E4]/85 hover:text-white'
                  }`}
                >
                  {renderNavPill(currentView === 'farmer_dashboard' || currentView === 'farm_profile')}
                  <span className="relative z-10">
                    {user?.role === 'fodder_supplier' ? 'Supplier Hub' : 'Farmer Hub'}
                  </span>
                </button>
              )}

              {user?.role === 'buyer' && (
                <button
                  type="button"
                  id="nav-buyer-hub-btn"
                  onClick={() => handleNav('buyer_dashboard')}
                  className={`relative px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentView === 'buyer_dashboard'
                      ? 'text-[#062B1F] font-bold'
                      : 'text-[#DFF4E4]/85 hover:text-white'
                  }`}
                >
                  {renderNavPill(currentView === 'buyer_dashboard')}
                  <span className="relative z-10">Buyer Hub</span>
                </button>
              )}

              {user?.role === 'admin' && (
                <button
                  type="button"
                  id="nav-admin-portal-btn"
                  onClick={() => handleNav('admin')}
                  className={`relative px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentView === 'admin'
                      ? 'text-[#062B1F] font-bold'
                      : 'text-[#DFF4E4]/85 hover:text-white'
                  }`}
                >
                  {renderNavPill(currentView === 'admin')}
                  <span className="relative z-10">Admin</span>
                </button>
              )}

              {user && (
                <button
                  type="button"
                  id="nav-orders-btn"
                  onClick={() => handleNav('orders')}
                  className={`relative px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentView === 'orders'
                      ? 'text-[#062B1F] font-bold'
                      : 'text-[#DFF4E4]/85 hover:text-white'
                  }`}
                >
                  {renderNavPill(currentView === 'orders')}
                  <span className="relative z-10">Orders</span>
                </button>
              )}
            </nav>
          </div>

          {/* Center-Right: Frosted Glass Search Input */}
          <form
            onSubmit={handleSearchFormSubmit}
            className="hidden xl:flex items-center flex-1 max-w-xs relative"
          >
            <Search className="w-4 h-4 text-[#DFF4E4]/65 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (onSearchChange) onSearchChange(e.target.value);
              }}
              placeholder="Search produce, farms..."
              aria-label="Search marketplace"
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white placeholder:text-[#DFF4E4]/55 focus:outline-none focus:bg-white/18 focus:border-[#A8E635] transition-all backdrop-blur-md"
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
                className="absolute right-3 text-[#DFF4E4]/60 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              id="navbar-search-toggle"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="xl:hidden p-1.5 sm:p-2 rounded-full text-[#DFF4E4]/85 hover:text-white hover:bg-white/12 transition-colors cursor-pointer"
              title="Search produce"
              aria-label="Search produce"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {isSellerRole(user?.role) && onOpenAddProduct && (
              <button
                type="button"
                id="navbar-add-product-btn"
                onClick={onOpenAddProduct}
                className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 lg-cta-lime text-[#062B1F] text-xs font-bold rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{user?.role === 'fodder_supplier' ? 'Add Fodder' : 'List Produce'}</span>
              </button>
            )}

            {user && (
              <button
                type="button"
                id="navbar-messages-btn"
                onClick={() => handleNav('messages', { channel: 'direct' })}
                className={`hidden sm:inline-flex relative p-2 rounded-full transition-colors cursor-pointer ${
                  currentView === 'messages'
                    ? 'bg-[#A8E635]/20 text-[#A8E635]'
                    : 'text-[#DFF4E4]/85 hover:text-white hover:bg-white/12'
                }`}
                title="Messages"
                aria-label="Messages"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-[#A8E635] text-[#062B1F] text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}

            {user && (
              <button
                type="button"
                id="navbar-notifications-btn"
                onClick={() => {
                  if (onOpenNotifications) {
                    onOpenNotifications();
                  } else {
                    handleNav('notifications');
                  }
                }}
                className={`hidden sm:inline-flex relative p-2 rounded-full transition-colors cursor-pointer ${
                  currentView === 'notifications'
                    ? 'bg-[#A8E635]/20 text-[#A8E635]'
                    : 'text-[#DFF4E4]/85 hover:text-white hover:bg-white/12'
                }`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-[#F4D35E] text-[#062B1F] text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              id="navbar-cart-btn"
              onClick={() => {
                if (onOpenCart) {
                  onOpenCart();
                } else {
                  openCart();
                }
              }}
              className="relative p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/18 border border-white/15 text-white transition-colors cursor-pointer"
              title="Shopping Cart"
              aria-label={`Shopping Cart (${totalItems} items)`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#A8E635] text-[#062B1F] text-[10px] font-extrabold flex items-center justify-center tabular-nums shadow-xs">
                  {totalItems}
                </span>
              )}
            </button>

            {user ? (
              <div ref={dropdownRef} className="relative pl-1 sm:pl-2.5 border-l border-white/15">
                <button
                  type="button"
                  id="navbar-user-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-0.5 sm:p-1 sm:pr-2 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8E635] cursor-pointer"
                  aria-label="User account menu"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#145A38] border border-[#A8E635]/60 overflow-hidden flex items-center justify-center shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-[#A8E635] text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left leading-tight max-w-[115px]">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-[#A8E635] font-semibold truncate">{getRoleLabel()}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#DFF4E4]/70 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div
                    id="user-dropdown-menu"
                    className="absolute right-0 mt-2.5 w-64 max-w-[calc(100vw-1.5rem)] lg-glass-dark rounded-2xl py-2 z-50 text-white"
                  >
                    <div className="px-4 py-2.5 border-b border-white/12">
                      <div className="font-bold text-white text-xs truncate">{user.name}</div>
                      <div className="text-[11px] text-[#DFF4E4]/65 truncate">{user.email}</div>
                      <div className="text-[11px] text-[#A8E635] font-semibold mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {user.location.city}, {user.location.province}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      {isSellerRole(user.role) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleNav('farmer_dashboard')}
                            className="w-full text-left px-4 py-2 text-xs text-[#DFF4E4] hover:bg-white/10 hover:text-white flex items-center gap-2.5 font-semibold cursor-pointer"
                          >
                            <LayoutDashboard className="w-4 h-4 text-[#A8E635]" />
                            {user.role === 'fodder_supplier' ? 'Fodder Supplier Portal' : 'Farmer Portal'}
                          </button>
                          <button
                            type="button"
                            id="navbar-my-farm-profile-btn"
                            onClick={() => handleNav('farm_profile', { farmerId: user.id })}
                            className="w-full text-left px-4 py-2 text-xs text-[#DFF4E4] hover:bg-white/10 hover:text-white flex items-center gap-2.5 font-semibold cursor-pointer"
                          >
                            <Store className="w-4 h-4 text-[#A8E635]" />
                            My Farm Profile &amp; Updates
                          </button>
                        </>
                      )}

                      {user.role === 'buyer' && (
                        <button
                          type="button"
                          onClick={() => handleNav('buyer_dashboard')}
                          className="w-full text-left px-4 py-2 text-xs text-[#DFF4E4] hover:bg-white/10 hover:text-white flex items-center gap-2.5 font-semibold cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#A8E635]" />
                          Buyer Hub
                        </button>
                      )}

                      {user.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleNav('admin')}
                          className="w-full text-left px-4 py-2 text-xs text-[#DFF4E4] hover:bg-white/10 hover:text-white flex items-center gap-2.5 font-semibold cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#A8E635]" />
                          Admin Portal
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleNav('orders')}
                        className="w-full text-left px-4 py-2 text-xs text-[#DFF4E4] hover:bg-white/10 hover:text-white flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-[#DFF4E4]/70" />
                        Orders & History
                      </button>

                      {user.role === 'buyer' && (
                        <button
                          type="button"
                          onClick={() => handleNav('favorites')}
                          className="w-full text-left px-4 py-2 text-xs text-[#DFF4E4] hover:bg-white/10 hover:text-white flex items-center gap-2.5 font-medium cursor-pointer"
                        >
                          <Heart className="w-4 h-4 text-[#DFF4E4]/70" />
                          Saved Produce
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleNav('messages', { channel: 'announcements' })}
                        className="w-full text-left px-4 py-2 text-xs text-[#DFF4E4] hover:bg-white/10 hover:text-white flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <Megaphone className="w-4 h-4 text-[#DFF4E4]/70" />
                        Announcements
                      </button>

                      {onOpenSettings && (
                        <button
                          type="button"
                          id="navbar-user-settings-btn"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenSettings();
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-[#DFF4E4] hover:bg-white/10 hover:text-white flex items-center gap-2.5 font-medium cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-[#DFF4E4]/70" />
                          User Settings
                        </button>
                      )}

                    </div>

                    <div className="border-t border-white/12 mt-1 pt-1">
                      <button
                        type="button"
                        id="navbar-logout-btn"
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-300 hover:bg-rose-500/20 flex items-center gap-2.5 font-bold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2.5 border-l border-white/15">
                <button
                  type="button"
                  id="navbar-login-btn"
                  onClick={() => onOpenAuth('login')}
                  className="px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 rounded-full transition-colors whitespace-nowrap cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  id="navbar-register-btn"
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:inline-flex px-4 py-1.5 text-xs font-bold lg-cta-lime text-[#062B1F] rounded-full transition-all whitespace-nowrap cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            )}

            <button
              type="button"
              id="navbar-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-full text-[#DFF4E4] hover:bg-white/12 md:hidden cursor-pointer shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expandable Search Bar (Mobile / Tablet) */}
        {mobileSearchOpen && (
          <form
            onSubmit={handleSearchFormSubmit}
            className="xl:hidden pb-3 pt-2 border-t border-white/12 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#DFF4E4]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (onSearchChange) onSearchChange(e.target.value);
                }}
                placeholder="Search fresh produce, fodder, or farms..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white/12 border border-white/20 rounded-full text-white placeholder:text-[#DFF4E4]/55 focus:outline-none focus:border-[#A8E635]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 lg-cta-lime text-[#062B1F] text-xs font-bold rounded-full shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>
        )}
      </div>

      {/* Mobile Liquid Glass Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu-drawer"
          className="md:hidden border-t border-white/15 bg-[#062B1F]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleNav('marketplace')}
              className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer"
            >
              <Store className="w-4 h-4 text-[#A8E635] shrink-0" />
              <span>Marketplace</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionLink('farmbridge-community-section', 'community')}
              className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#A8E635] shrink-0" />
              <span>Community</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionLink('buyer-requests-section', 'requests')}
              className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer"
            >
              <ClipboardList className="w-4 h-4 text-[#A8E635] shrink-0" />
              <span>Buyer Requests</span>
            </button>

            {isSellerRole(user?.role) ? (
              <button
                type="button"
                onClick={() => handleNav('farmer_dashboard')}
                className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-[#A8E635] shrink-0" />
                <span>{user?.role === 'fodder_supplier' ? 'Supplier Hub' : 'Farmer Hub'}</span>
              </button>
            ) : user?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => handleNav('admin')}
                className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#A8E635] shrink-0" />
                <span>Admin Portal</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (user ? handleNav('buyer_dashboard') : onOpenAuth('login'))}
                className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-[#A8E635] shrink-0" />
                <span>Buyer Hub</span>
              </button>
            )}

            {user && (
              <>
                {isSellerRole(user.role) && (
                  <button
                    type="button"
                    onClick={() => handleNav('farm_profile', { farmerId: user.id })}
                    className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer col-span-2"
                  >
                    <Store className="w-4 h-4 text-[#A8E635] shrink-0" />
                    <span>My Farm Profile &amp; Updates</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleNav('orders')}
                  className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#A8E635] shrink-0" />
                  <span>Orders</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('messages', { channel: 'direct' })}
                  className="flex items-center gap-2 p-3 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold text-left cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-[#A8E635] shrink-0" />
                  <span>Messages</span>
                </button>
              </>
            )}
          </div>

          {!user && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('register');
              }}
              className="w-full py-2.5 min-h-[44px] rounded-2xl lg-cta-lime text-[#062B1F] text-xs font-extrabold cursor-pointer"
            >
              Create Account
            </button>
          )}

          {user && onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 min-h-[44px] rounded-2xl text-xs text-white bg-white/10 border border-white/15 font-semibold cursor-pointer"
            >
              <Settings className="w-4 h-4 text-[#A8E635]" />
              <span>User Settings</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
