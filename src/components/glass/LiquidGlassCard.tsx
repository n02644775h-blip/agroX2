import React, { useRef, useState } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

export type LiquidGlassVariant = 'light' | 'mint' | 'dark' | 'frosted';

interface LiquidGlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  variant?: LiquidGlassVariant;
  interactive?: boolean;
  shimmer?: boolean;
  specular?: boolean;
}

const VARIANT_CLASS: Record<LiquidGlassVariant, string> = {
  light: 'lg-glass-light text-[#0B261C]',
  mint: 'lg-glass-mint text-[#0B261C]',
  dark: 'lg-glass-dark text-white',
  frosted: 'lg-glass-frosted text-white'
};

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  variant = 'light',
  interactive = false,
  shimmer = false,
  specular = true,
  className = '',
  onMouseMove,
  onMouseLeave,
  ...rest
}) => {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 25,
    active: false
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (specular && !prefersReducedMotion && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setSpot({ x, y, active: true });
      }
    }
    onMouseMove?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (spot.active) {
      setSpot((prev) => ({ ...prev, active: false }));
    }
    onMouseLeave?.(e);
  };

  const isDarkSurface = variant === 'dark' || variant === 'frosted';

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={
        interactive && !prefersReducedMotion
          ? { y: -3, transition: { type: 'spring', stiffness: 360, damping: 28 } }
          : undefined
      }
      className={`relative rounded-3xl ${VARIANT_CLASS[variant]} ${
        shimmer && !prefersReducedMotion ? 'lg-shimmer-beam' : ''
      } ${className}`}
      {...rest}
    >
      {/* Curved Optical Rim Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/25"
        style={{
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 45%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 45%)'
        }}
      />

      {/* Pointer-Tracking Specular Refraction Spot (desktop fine pointer) */}
      {specular && !prefersReducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 hidden md:block"
          style={{
            opacity: spot.active ? 1 : 0,
            background: isDarkSurface
              ? `radial-gradient(280px circle at ${spot.x}% ${spot.y}%, rgba(168,230,53,0.16), rgba(255,255,255,0.08) 42%, transparent 72%)`
              : `radial-gradient(280px circle at ${spot.x}% ${spot.y}%, rgba(255,255,255,0.68), rgba(168,230,53,0.10) 45%, transparent 74%)`
          }}
        />
      )}

      <div className="relative z-[1] h-full">{children}</div>
    </motion.div>
  );
};
