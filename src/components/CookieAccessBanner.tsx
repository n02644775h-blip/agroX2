import React, { useState, useEffect } from 'react';
import {
  checkStorageAccessStatus,
  requestStorageAccessPermission,
  setCookie,
  getCookie
} from '../services/cookieService';
import { ShieldCheck, Cookie, CheckCircle2, X } from 'lucide-react';

export const CookieAccessBanner: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('agrox_cookie_prompt_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let isMounted = true;

    async function evaluateAccess() {
      if (dismissed) return;
      const status = await checkStorageAccessStatus();
      if (!isMounted) return;
      if (status.isIframe) {
        if (!status.hasAccess) {
          setShowPrompt(true);
        } else {
          setAccessGranted(true);
        }
      }
    }

    evaluateAccess();
    return () => {
      isMounted = false;
    };
  }, [dismissed]);

  const handleGrantAccess = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestStorageAccessPermission();
      setCookie('agrox_cookie_enabled', 'true', 365);

      if (granted || getCookie('agrox_cookie_enabled') === 'true') {
        setAccessGranted(true);
        setShowPrompt(false);
        window.dispatchEvent(new CustomEvent('agrox_storage_access_granted'));
        setTimeout(() => {
          setAccessGranted(false);
        }, 4000);
      } else {
        setShowPrompt(false);
      }
    } catch (err) {
      console.warn('Error during cookie permission request:', err);
      setShowPrompt(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem('agrox_cookie_prompt_dismissed', 'true');
    } catch {}
    setDismissed(true);
  };

  if (accessGranted) {
    return (
      <div className="bg-[#145A38] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between border-b border-white/15">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <CheckCircle2 className="w-4 h-4 text-[#A8E635] shrink-0" />
          <span>Browser cookie & storage access enabled! Your session will persist across page refreshes.</span>
        </div>
      </div>
    );
  }

  if (!showPrompt || dismissed) {
    return null;
  }

  return (
    <div
      id="cookie-access-request-banner"
      className="bg-linear-to-r from-[#062B1F] via-[#0B3D2B] to-[#145A38] text-white px-4 py-2.5 shadow-md sticky top-0 z-50 border-b border-[#A8E635]/30 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-left w-full sm:w-auto">
          <div className="p-1.5 bg-white/15 border border-white/20 rounded-xl shrink-0">
            <Cookie className="w-4 h-4 text-[#A8E635]" />
          </div>
          <div>
            <span className="font-bold">Keep Signed In Across Refreshes:</span>{' '}
            <span className="text-[#DFF4E4]/85">
              Grant browser cookie & storage permissions so your login and farm profile remain saved.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            id="allow-cookie-access-btn"
            onClick={handleGrantAccess}
            disabled={isRequesting}
            className="px-3.5 py-1.5 lg-cta-lime text-[#062B1F] rounded-full font-bold shadow-xs transition-all flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isRequesting ? 'Requesting...' : 'Allow Cookie Access'}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-[#DFF4E4]/75 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
