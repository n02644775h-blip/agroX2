import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Wifi,
  Battery,
  Signal,
  Download,
  Share2,
  ChevronLeft
} from 'lucide-react';

interface AndroidDeviceShellProps {
  children: React.ReactNode;
  onOpenInstallModal: () => void;
  isAndroidView: boolean;
  setIsAndroidView: (val: boolean) => void;
}

export const AndroidDeviceShell: React.FC<AndroidDeviceShellProps> = ({
  children,
  onOpenInstallModal,
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
      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-stone-900 text-stone-200 border-b border-stone-800 text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-950 text-green-400 font-bold border border-green-800/60">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android Optimized Application</span>
          </div>
          <span className="text-stone-400 hidden lg:inline">
            Designed for mobile touch, Android WebAPK, and responsive screens
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="open-android-install-modal-top"
            onClick={onOpenInstallModal}
            className="flex items-center gap-1.5 px-3 py-1 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install Android App / APK</span>
          </button>

          <div className="flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700">
            <button
              id="toggle-desktop-view-btn"
              onClick={() => setIsAndroidView(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
                !isAndroidView
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
            <button
              id="toggle-android-view-btn"
              onClick={() => setIsAndroidView(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
                isAndroidView
                  ? 'bg-green-700 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
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
        <div className="flex-1 bg-stone-950 flex items-center justify-center p-4 sm:p-8">
          {/* Simulated Android Smartphone Frame (e.g. Pixel / Galaxy) */}
          <div className="relative w-full max-w-[420px] h-[880px] bg-stone-900 rounded-[48px] p-3 shadow-2xl ring-1 ring-stone-700/60 shadow-black/80 flex flex-col overflow-hidden">
            {/* Outer Bezel Frame */}
            <div className="relative w-full h-full bg-[#F4F7F5] rounded-[38px] overflow-hidden flex flex-col border border-stone-300">
              {/* Android Native Status Bar */}
              <div className="h-9 bg-green-900 text-white px-6 flex items-center justify-between text-[11px] font-semibold select-none shrink-0 z-50">
                <span>{currentTime || '12:00'}</span>
                
                {/* Camera Punch Hole */}
                <div className="w-3.5 h-3.5 bg-black rounded-full border border-stone-800 shadow-inner"></div>

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

              {/* Scrollable Android App Canvas */}
              <div className="flex-1 overflow-y-auto scrollbar-none pb-20 relative">
                {children}
              </div>

              {/* Android Gesture Navigation Pill at Bottom */}
              <div className="absolute bottom-1 left-0 right-0 h-4 flex items-center justify-center pointer-events-none z-50">
                <div className="w-32 h-1 bg-stone-400 rounded-full opacity-60"></div>
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
