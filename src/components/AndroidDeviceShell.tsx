import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Wifi,
  Battery,
  Signal
} from 'lucide-react';

interface AndroidDeviceShellProps {
  children: React.ReactNode;
  isAndroidView: boolean;
  setIsAndroidView: (val: boolean) => void;
}

export const AndroidDeviceShell: React.FC<AndroidDeviceShellProps> = ({
  children,
  isAndroidView,
  setIsAndroidView
}) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Top Android Platform Switcher Ribbon (Only visible on larger screens) */}
      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-[#041E15] text-[#DFF4E4] border-b border-white/10 text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#145A38]/40 text-[#A8E635] font-bold border border-[#A8E635]/30">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android Optimized Application</span>
          </div>
          <span className="text-[#DFF4E4]/65 hidden lg:inline">
            Designed for mobile touch, Android WebAPK, and responsive screens
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/8 rounded-full p-0.5 border border-white/15">
            <button
              id="toggle-desktop-view-btn"
              onClick={() => setIsAndroidView(false)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                !isAndroidView
                  ? 'bg-[#145A38] text-white shadow-xs'
                  : 'text-[#DFF4E4]/70 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
            <button
              id="toggle-android-view-btn"
              onClick={() => setIsAndroidView(true)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                isAndroidView
                  ? 'bg-[#A8E635] text-[#062B1F] font-bold shadow-xs'
                  : 'text-[#DFF4E4]/70 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Frame</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Render */}
      {isAndroidView ? (
        <div className="flex-1 bg-[#041912] flex items-center justify-center p-4 sm:p-8">
          <div className="relative w-full max-w-[420px] h-[880px] bg-[#0B261C] rounded-[48px] p-3 shadow-2xl ring-1 ring-white/20 flex flex-col overflow-hidden">
            <div className="relative w-full h-full bg-[#F8FAF7] rounded-[38px] overflow-hidden flex flex-col border border-white/25">
              <div className="h-9 bg-[#062B1F] text-white px-6 flex items-center justify-between text-[11px] font-semibold select-none shrink-0 z-50">
                <span>{currentTime || '12:00'}</span>
                <div className="w-3.5 h-3.5 bg-black rounded-full border border-white/15 shadow-inner" />
                <div className="flex items-center gap-2 text-white/90">
                  <Signal className="w-3 h-3" />
                  <span className="text-[10px] font-bold">5G</span>
                  <Wifi className="w-3 h-3" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px]">98%</span>
                    <Battery className="w-3.5 h-3.5 fill-white text-white" />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-none pb-20 relative">
                {children}
              </div>

              <div className="absolute bottom-1 left-0 right-0 h-4 flex items-center justify-center pointer-events-none z-50">
                <div className="w-32 h-1 bg-[#062B1F]/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col pb-16 md:pb-0">
          {children}
        </div>
      )}
    </div>
  );
};
