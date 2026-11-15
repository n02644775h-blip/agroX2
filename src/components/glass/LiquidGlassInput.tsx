import React from 'react';

interface FrostedFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  tone?: 'dark' | 'light';
}

export const LiquidGlassInput: React.FC<FrostedFieldProps> = ({
  leftIcon,
  rightSlot,
  tone = 'light',
  className = '',
  ...rest
}) => {
  const toneClass =
    tone === 'dark'
      ? 'bg-white/14 border-white/30 text-white placeholder:text-white/65 focus:bg-white/20 focus:border-[#A8E635]'
      : 'bg-white/75 border-[#145A38]/16 text-[#0B261C] placeholder:text-[#0B261C]/45 focus:bg-white focus:border-[#145A38]';

  return (
    <div className="relative">
      {leftIcon && (
        <span
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
            tone === 'dark' ? 'text-white/75' : 'text-[#145A38]/65'
          }`}
        >
          {leftIcon}
        </span>
      )}
      <input
        {...rest}
        className={`w-full ${leftIcon ? 'pl-10' : 'pl-4'} ${
          rightSlot ? 'pr-10' : 'pr-4'
        } py-2.5 rounded-2xl border backdrop-blur-md text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#A8E635]/40 ${toneClass} ${className}`}
      />
      {rightSlot && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {rightSlot}
        </span>
      )}
    </div>
  );
};
