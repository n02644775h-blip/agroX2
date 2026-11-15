import React from 'react';

export const LiquidGlassDefs: React.FC = () => {
  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed h-0 w-0 overflow-hidden"
        focusable="false"
      >
        <defs>
          <filter id="fb-liquid-refract" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <linearGradient id="fb-lime-emerald-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
            <stop offset="50%" stopColor="rgba(168,230,53,0.45)" />
            <stop offset="100%" stopColor="rgba(20,90,56,0.35)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Fixed subtle ambient background orbs framing the Cream White / Soft Mint canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="lg-orb-animate absolute -top-36 -left-32 h-[420px] w-[420px] rounded-full opacity-55 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(223,244,228,0.92) 0%, rgba(168,230,53,0.16) 55%, rgba(248,250,247,0) 75%)'
          }}
        />
        <div
          className="lg-orb-animate absolute top-[35%] -right-36 h-[480px] w-[480px] rounded-full opacity-45 blur-3xl"
          style={{
            animationDelay: '-4s',
            background:
              'radial-gradient(circle, rgba(20,90,56,0.13) 0%, rgba(223,244,228,0.65) 55%, rgba(248,250,247,0) 78%)'
          }}
        />
        <div
          className="lg-orb-animate absolute -bottom-40 left-[22%] h-[380px] w-[380px] rounded-full opacity-40 blur-3xl"
          style={{
            animationDelay: '-7s',
            background:
              'radial-gradient(circle, rgba(244,211,94,0.16) 0%, rgba(223,244,228,0.5) 52%, rgba(248,250,247,0) 75%)'
          }}
        />
      </div>
    </>
  );
};
