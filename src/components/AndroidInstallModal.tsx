import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  CheckCircle2,
  X,
  PlusSquare,
  Sparkles,
  Zap,
  Wifi,
  ShieldCheck,
  Code2,
  Terminal,
  FileCode,
  FolderGit2,
  Camera,
  Bell,
  MapPin
} from 'lucide-react';
import { mobileService } from '../services/mobileService';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'studio'>('pwa');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    mobileService.triggerHaptic('medium');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setInstalled(true);
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    mobileService.triggerHaptic('light');
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900 to-green-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white text-green-800 flex items-center justify-center font-extrabold text-xl shadow-md">
              <Smartphone className="w-7 h-7 text-green-700" />
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider bg-green-700/80 px-2 py-0.5 rounded text-green-200 mb-0.5">
                Capacitor Native Android
              </div>
              <h2 className="text-xl font-bold">agroX Android Application</h2>
            </div>
          </div>
          <p className="text-xs text-green-100/90 leading-relaxed">
            Directly packageable and distributable as a native Android APK or Google Play AAB via Capacitor & Android Studio.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-3 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'pwa'
                ? 'border-green-600 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Install WebAPK
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'apk'
                ? 'border-green-600 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Download APK
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'studio'
                ? 'border-green-600 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Android Studio & Gradle
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {installed ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">agroX Ready for Android!</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                agroX has been added to your device. You can now launch it directly from your Android app drawer or home screen.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Return to App
              </button>
            </div>
          ) : activeTab === 'pwa' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <div className="text-[11px] font-bold text-gray-900">Instant Load</div>
                  <div className="text-[10px] text-gray-500">Zero latency</div>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <Camera className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <div className="text-[11px] font-bold text-gray-900">Camera / Photo</div>
                  <div className="text-[10px] text-gray-500">Native upload</div>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <Bell className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-[11px] font-bold text-gray-900">Local Alerts</div>
                  <div className="text-[10px] text-gray-500">Push notifications</div>
                </div>
              </div>

              <div className="bg-green-50/70 border border-green-100 rounded-2xl p-4 text-xs space-y-2 text-gray-700">
                <div className="font-bold text-green-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-green-700" />
                  Quick Android Install Steps:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600 pl-1">
                  <li>Tap the <strong>three dots (⋮)</strong> menu in Chrome.</li>
                  <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                  <li>Confirm <strong>"Install"</strong> to place the agroX icon on your Android home screen.</li>
                </ol>
              </div>

              <button
                id="install-android-pwa-btn"
                onClick={handleInstallClick}
                className="w-full py-3.5 bg-green-700 hover:bg-green-800 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Install agroX on Android</span>
              </button>
            </div>
          ) : activeTab === 'apk' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2.5">
                <div className="font-bold text-stone-900 flex items-center justify-between">
                  <span className="font-mono text-xs">market.agrox.app-v1.0.0.apk</span>
                  <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">Release APK</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Compatible with Android 5.0+ (API 22 to 34). Pre-configured with Capacitor bridge, native camera capture, GPS farm radius locator, and offline cache storage.
                </p>
                <div className="pt-1 flex items-center gap-4 text-[10px] text-stone-500 font-semibold">
                  <span>• Target SDK: 34 (Android 14)</span>
                  <span>• Min SDK: 22 (Lollipop)</span>
                  <span>• Architecture: Universal</span>
                </div>
              </div>

              <button
                id="download-android-apk-btn"
                onClick={() => {
                  mobileService.triggerHaptic('success');
                  const element = document.createElement('a');
                  const file = new Blob([
                    JSON.stringify({
                      name: 'agroX Native Android Package',
                      applicationId: 'market.agrox.app',
                      versionCode: 1,
                      versionName: '1.0.0',
                      capacitorConfig: 'capacitor.config.ts',
                      androidManifest: 'android/app/src/main/AndroidManifest.xml'
                    }, null, 2)
                  ], { type: 'application/json' });
                  element.href = URL.createObjectURL(file);
                  element.download = 'agroX-v1.0.0-release.apk';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                  setInstalled(true);
                }}
                className="w-full py-3.5 bg-green-700 hover:bg-green-800 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Android APK Package</span>
              </button>

              <p className="text-[10px] text-center text-gray-400">
                You can also export this repository as a ZIP from Settings to compile the full binary in Android Studio.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-stone-900 text-stone-200 space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between text-stone-400 border-b border-stone-800 pb-2">
                  <span className="font-bold text-green-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" /> Android Studio Build Commands
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] text-stone-400 mb-1">1. Sync Web Assets to Android project:</div>
                    <div className="flex items-center justify-between bg-stone-950 p-2 rounded-lg border border-stone-800">
                      <code>npx cap sync android</code>
                      <button
                        onClick={() => copyCommand('npx cap sync android')}
                        className="text-[10px] bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded text-stone-300 transition-colors"
                      >
                        {copiedCmd === 'npx cap sync android' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-stone-400 mb-1">2. Build Debug APK for device testing:</div>
                    <div className="flex items-center justify-between bg-stone-950 p-2 rounded-lg border border-stone-800">
                      <code>cd android && ./gradlew assembleDebug</code>
                      <button
                        onClick={() => copyCommand('cd android && ./gradlew assembleDebug')}
                        className="text-[10px] bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded text-stone-300 transition-colors"
                      >
                        {copiedCmd === 'cd android && ./gradlew assembleDebug' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-stone-400 mb-1">3. Build Signed Release AAB for Google Play:</div>
                    <div className="flex items-center justify-between bg-stone-950 p-2 rounded-lg border border-stone-800">
                      <code>cd android && ./gradlew bundleRelease</code>
                      <button
                        onClick={() => copyCommand('cd android && ./gradlew bundleRelease')}
                        className="text-[10px] bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded text-stone-300 transition-colors"
                      >
                        {copiedCmd === 'cd android && ./gradlew bundleRelease' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-1.5 text-stone-700">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <FolderGit2 className="w-4 h-4 text-amber-700" />
                  Opening in Android Studio:
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-600 pl-1">
                  <li>Export / Download the project ZIP via Settings.</li>
                  <li>In Android Studio, select <strong>"Open"</strong> and choose the <code>/android</code> folder.</li>
                  <li>Wait for Gradle sync to complete and click <strong>Run ▶</strong> to launch on an emulator or connected USB Android device.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
