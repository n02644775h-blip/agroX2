import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

interface LiquidGlassModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
  id?: string;
  tone?: 'light' | 'dark';
  headerClassName?: string;
  hideHeader?: boolean;
}

export const LiquidGlassModal: React.FC<LiquidGlassModalProps> = ({
  isOpen = true,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidthClass = 'max-w-lg',
  id,
  tone = 'light',
  headerClassName = '',
  hideHeader = false
}) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const panelSurface =
    tone === 'dark'
      ? 'lg-glass-dark text-white'
      : 'bg-[#F8FAF7]/95 backdrop-blur-2xl border border-white/85 text-[#0B261C] shadow-[0_32px_80px_-20px_rgba(6,43,31,0.45)]';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-[#062B1F]/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            id={id}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidthClass} rounded-3xl overflow-hidden flex flex-col max-h-[92vh] ${panelSurface}`}
          >
            {!hideHeader && (
              <div
                className={`px-6 py-4 flex items-center justify-between gap-3 shrink-0 ${
                  tone === 'dark'
                    ? 'bg-[#062B1F]/80 border-b border-white/12 text-white'
                    : 'bg-linear-to-r from-[#062B1F] via-[#0B3D2B] to-[#145A38] text-white border-b border-white/15'
                } ${headerClassName}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div className="w-10 h-10 rounded-2xl bg-white/14 border border-white/25 flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && <h2 className="font-extrabold text-base sm:text-lg truncate text-white">{title}</h2>}
                    {subtitle && <p className="text-xs text-[#DFF4E4]/80 truncate">{subtitle}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#DFF4E4] hover:text-white transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
