import React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

export type LiquidGlassButtonVariant =
  | 'lime'
  | 'emerald'
  | 'glass'
  | 'light'
  | 'danger'
  | 'ghost';

export type LiquidGlassButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface LiquidGlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: LiquidGlassButtonVariant;
  size?: LiquidGlassButtonSize;
}

const VARIANT_CLASSES: Record<LiquidGlassButtonVariant, string> = {
  lime: 'lg-cta-lime text-[#062B1F] font-bold',
  emerald: 'lg-cta-emerald text-white font-bold',
  glass:
    'lg-glass-pill text-white hover:bg-white/22 font-semibold border border-white/35',
  light:
    'bg-white/85 hover:bg-white text-[#062B1F] border border-[#0B3D2B]/14 shadow-xs font-semibold backdrop-blur-md',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white border border-rose-400/40 shadow-md shadow-rose-900/20 font-bold',
  ghost:
    'bg-transparent hover:bg-[#145A38]/10 text-[#0B3D2B] font-semibold'
};

const SIZE_CLASSES: Record<LiquidGlassButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
  sm: 'px-4 py-2 text-xs rounded-xl gap-2',
  md: 'px-5 py-2.5 text-sm rounded-2xl gap-2',
  lg: 'px-6 py-3.5 text-sm rounded-2xl gap-2.5'
};

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  children,
  variant = 'emerald',
  size = 'md',
  className = '',
  disabled,
  type = 'button',
  ...rest
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={!disabled && !prefersReducedMotion ? { scale: 0.975 } : undefined}
      whileHover={!disabled && !prefersReducedMotion ? { y: -1 } : undefined}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8E635] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062B1F] disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
};
