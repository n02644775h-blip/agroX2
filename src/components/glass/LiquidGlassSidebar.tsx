import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  buttonId?: string;
}

interface LiquidGlassSidebarProps {
  brandTitle?: string;
  sectionTitle?: string;
  items: SidebarNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  footerAction?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    id?: string;
  };
  secondaryLinks?: SidebarNavItem[];
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  layoutNamespace?: string;
  userSummary?: {
    name: string;
    subtitle: string;
    avatar?: string;
  };
}

export const LiquidGlassSidebar: React.FC<LiquidGlassSidebarProps> = ({
  brandTitle = 'FarmBridge.',
  sectionTitle = 'HUB NAVIGATION',
  items,
  activeId,
  onSelect,
  footerAction,
  secondaryLinks,
  mobileOpen = false,
  onCloseMobile,
  layoutNamespace = 'hub-sidebar',
  userSummary
}) => {
  const prefersReducedMotion = useReducedMotion();

  const renderSidebarBody = (inMobileDrawer: boolean) => (
    <div className="flex flex-col h-full justify-between p-4 text-white">
      <div className="space-y-5">
        {/* Brand Row */}
        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <img
                src="/assets/farmbridge-logo-white.png"
                alt="FarmBridge logo"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white truncate">
              {brandTitle}
            </span>
          </div>
          {inMobileDrawer && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {userSummary && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/8 border border-white/12">
            {userSummary.avatar ? (
              <img
                src={userSummary.avatar}
                alt={userSummary.name}
                className="w-9 h-9 rounded-full object-cover border border-[#A8E635]/60 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#A8E635]/20 text-[#A8E635] font-bold text-xs flex items-center justify-center shrink-0">
                {userSummary.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] text-[#DFF4E4]/70 uppercase tracking-wider font-semibold">
                Welcome back
              </p>
              <p className="text-xs font-bold text-white truncate">{userSummary.name}</p>
              <p className="text-[10px] text-[#A8E635] truncate">{userSummary.subtitle}</p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="px-3 text-[10px] font-extrabold tracking-widest uppercase text-[#DFF4E4]/55">
            {sectionTitle}
          </div>

          <nav className="space-y-1">
            {items.map((item) => {
              const active = activeId === item.id;
              return (
                <button
                  key={item.id}
                  id={item.buttonId}
                  type="button"
                  onClick={() => {
                    onSelect(item.id);
                    if (inMobileDrawer && onCloseMobile) onCloseMobile();
                  }}
                  className={`relative w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'text-[#062B1F] font-bold'
                      : 'text-[#DFF4E4]/85 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={
                        prefersReducedMotion ? undefined : `${layoutNamespace}-active-pill`
                      }
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-2xl bg-linear-to-r from-[#A8E635] via-[#9EE233] to-[#68C42F] shadow-lg shadow-[#A8E635]/25 border border-white/55"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5 min-w-0">
                    <span className={active ? 'text-[#062B1F]' : 'text-[#A8E635]'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && Number(item.badge) > 0 && (
                    <span
                      className={`relative z-10 min-w-5 h-5 px-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center tabular-nums ${
                        active
                          ? 'bg-[#062B1F] text-[#A8E635]'
                          : 'bg-[#A8E635] text-[#062B1F]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {secondaryLinks && secondaryLinks.length > 0 && (
            <div className="pt-3 mt-3 border-t border-white/12 space-y-1">
              {secondaryLinks.map((sec) => (
                <button
                  key={sec.id}
                  id={sec.buttonId}
                  type="button"
                  onClick={() => {
                    onSelect(sec.id);
                    if (inMobileDrawer && onCloseMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl text-xs font-medium text-[#DFF4E4]/80 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[#DFF4E4]/70">{sec.icon}</span>
                    <span className="truncate">{sec.label}</span>
                  </span>
                  {sec.badge !== undefined && Number(sec.badge) > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-white/16 text-[#A8E635] text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {sec.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {footerAction && (
        <div className="pt-4 mt-4 border-t border-white/12">
          <button
            id={footerAction.id}
            type="button"
            onClick={() => {
              footerAction.onClick();
              if (inMobileDrawer && onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/8 hover:bg-white/15 border border-white/18 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            {footerAction.icon}
            <span>{footerAction.label}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Liquid Glass Forest Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="lg-glass-dark rounded-3xl sticky top-20 min-h-[640px] max-h-[calc(100vh-6rem)] overflow-y-auto">
          {renderSidebarBody(false)}
        </div>
      </aside>

      {/* Mobile Slide-Over Liquid Glass Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-[#062B1F]/70 backdrop-blur-sm flex"
          onClick={onCloseMobile}
        >
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-72 max-w-[85vw] h-full bg-[#062B1F]/95 backdrop-blur-2xl border-r border-white/20 overflow-y-auto shadow-2xl"
          >
            {renderSidebarBody(true)}
          </motion.div>
        </div>
      )}
    </>
  );
};
