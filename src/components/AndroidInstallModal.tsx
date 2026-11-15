import React, { useState, useEffect } from 'react';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
  Download,
  CheckCircle2,
  Sparkles,
  Zap,
  Terminal,
  FolderGit2,
  Camera,
  Bell
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
    <LiquidGlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="FarmBridge Application"
      subtitle="Native Android APK & WebAPK Install"
      icon={
        <img
          src="/assets/farmbridge-logo-white.png"
          alt="FarmBridge logo"
          className="w-6 h-6 object-contain"
        />
      }
      maxWidthClass="max-w-lg"
    >
      {/* Tab Switcher */}
      <div className="flex border-b border-[#145A38]/12 bg-[#DFF4E4]/45 px-4 pt-3 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pwa')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'pwa'
              ? 'border-[#145A38] text-[#062B1F]'
              : 'border-transparent text-[#0B261C]/60 hover:text-[#062B1F]'
          }`}
        >
          Install WebAPK
        </button>
        <button
          onClick={() => setActiveTab('apk')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'apk'
              ? 'border-[#145A38] text-[#062B1F]'
              : 'border-transparent text-[#0B261C]/60 hover:text-[#062B1F]'
          }`}
        >
          Download APK
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'studio'
              ? 'border-[#145A38] text-[#062B1F]'
              : 'border-transparent text-[#0B261C]/60 hover:text-[#062B1F]'
          }`}
        >
          Android Studio & Gradle
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5 sm:p-6 space-y-4">
        {installed ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 bg-[#DFF4E4] text-[#145A38] rounded-full flex items-center justify-center mx-auto border border-[#145A38]/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-[#062B1F] text-lg">FarmBridge Ready for Android!</h3>
            <p className="text-xs text-[#0B261C]/70 max-w-xs mx-auto">
              FarmBridge has been added to your device. You can now launch it directly from your Android app drawer or home screen.
            </p>
            <LiquidGlassButton variant="emerald" size="md" className="w-full" onClick={onClose}>
              Return to App
            </LiquidGlassButton>
          </div>
        ) : activeTab === 'pwa' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl lg-glass-light border border-[#145A38]/10">
                <Zap className="w-5 h-5 text-[#145A38] mx-auto mb-1" />
                <div className="text-[11px] font-bold text-[#062B1F]">Instant Load</div>
                <div className="text-[10px] text-[#0B261C]/60">Zero latency</div>
              </div>
              <div className="p-3 rounded-2xl lg-glass-light border border-[#145A38]/10">
                <Camera className="w-5 h-5 text-[#145A38] mx-auto mb-1" />
                <div className="text-[11px] font-bold text-[#062B1F]">Camera / Photo</div>
                <div className="text-[10px] text-[#0B261C]/60">Native upload</div>
              </div>
              <div className="p-3 rounded-2xl lg-glass-light border border-[#145A38]/10">
                <Bell className="w-5 h-5 text-[#145A38] mx-auto mb-1" />
                <div className="text-[11px] font-bold text-[#062B1F]">Local Alerts</div>
                <div className="text-[10px] text-[#0B261C]/60">Push updates</div>
              </div>
            </div>

            <div className="lg-glass-mint border border-[#145A38]/15 rounded-2xl p-4 text-xs space-y-2 text-[#0B261C]">
              <div className="font-bold text-[#062B1F] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#145A38]" />
                Quick Android Install Steps:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#0B261C]/75 pl-1">
                <li>Tap the <strong>three dots (⋮)</strong> menu in Chrome.</li>
                <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Confirm <strong>"Install"</strong> to place the FarmBridge icon on your Android home screen.</li>
              </ol>
            </div>

            <LiquidGlassButton
              id="install-android-pwa-btn"
              variant="lime"
              size="lg"
              className="w-full"
              onClick={handleInstallClick}
            >
              <Download className="w-4 h-4" />
              <span>Install FarmBridge Application</span>
            </LiquidGlassButton>
          </div>
        ) : activeTab === 'apk' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl lg-glass-mint border border-[#145A38]/15 text-xs space-y-2.5">
              <div className="font-bold text-[#062B1F] flex items-center justify-between">
                <span className="font-mono text-xs">market.agrox.app-v1.0.0.apk</span>
                <span className="text-[10px] bg-[#A8E635] text-[#062B1F] px-2.5 py-0.5 rounded-full font-extrabold">Release APK</span>
              </div>
              <p className="text-[11px] text-[#0B261C]/75 leading-relaxed">
                Compatible with Android 5.0+ (API 22 to 34). Pre-configured with Capacitor bridge, native camera capture, GPS farm radius locator, and offline cache storage.
              </p>
              <div className="pt-1 flex items-center gap-4 text-[10px] text-[#0B261C]/60 font-semibold">
                <span>• Target SDK: 34 (Android 14)</span>
                <span>• Min SDK: 22</span>
                <span>• Universal</span>
              </div>
            </div>

            <LiquidGlassButton
              id="download-android-apk-btn"
              variant="emerald"
              size="lg"
              className="w-full"
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
            >
              <Download className="w-4 h-4" />
              <span>Download Android APK Package</span>
            </LiquidGlassButton>

            <p className="text-[10px] text-center text-[#0B261C]/50">
              You can also export this repository as a ZIP from Settings to compile the full binary in Android Studio.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#062B1F] text-[#DFF4E4] space-y-3 font-mono text-[11px] border border-white/15">
              <div className="flex items-center justify-between text-[#DFF4E4]/70 border-b border-white/10 pb-2">
                <span className="font-bold text-[#A8E635] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> Android Studio Build Commands
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-[#DFF4E4]/65 mb-1">1. Sync Web Assets to Android project:</div>
                  <div className="flex items-center justify-between bg-black/30 p-2 rounded-xl border border-white/10">
                    <code>npx cap sync android</code>
                    <button
                      onClick={() => copyCommand('npx cap sync android')}
                      className="text-[10px] bg-white/15 hover:bg-white/25 px-2.5 py-0.5 rounded-lg text-white transition-colors cursor-pointer"
                    >
                      {copiedCmd === 'npx cap sync android' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#DFF4E4]/65 mb-1">2. Build Debug APK for device testing:</div>
                  <div className="flex items-center justify-between bg-black/30 p-2 rounded-xl border border-white/10">
                    <code>cd android && ./gradlew assembleDebug</code>
                    <button
                      onClick={() => copyCommand('cd android && ./gradlew assembleDebug')}
                      className="text-[10px] bg-white/15 hover:bg-white/25 px-2.5 py-0.5 rounded-lg text-white transition-colors cursor-pointer"
                    >
                      {copiedCmd === 'cd android && ./gradlew assembleDebug' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#DFF4E4]/65 mb-1">3. Build Signed Release AAB for Google Play:</div>
                  <div className="flex items-center justify-between bg-black/30 p-2 rounded-xl border border-white/10">
                    <code>cd android && ./gradlew bundleRelease</code>
                    <button
                      onClick={() => copyCommand('cd android && ./gradlew bundleRelease')}
                      className="text-[10px] bg-white/15 hover:bg-white/25 px-2.5 py-0.5 rounded-lg text-white transition-colors cursor-pointer"
                    >
                      {copiedCmd === 'cd android && ./gradlew bundleRelease' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#F4D35E]/20 border border-[#F4D35E]/40 rounded-2xl p-3.5 space-y-1.5 text-[#062B1F]">
              <div className="font-bold flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4 text-[#145A38]" />
                Opening in Android Studio:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#0B261C]/80 pl-1">
                <li>Export / Download the project ZIP via Settings.</li>
                <li>In Android Studio, select <strong>"Open"</strong> and choose the <code>/android</code> folder.</li>
                <li>Wait for Gradle sync to complete and click <strong>Run ▶</strong> on an emulator or USB Android device.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </LiquidGlassModal>
  );
};
