import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app, { db } from '../firebase/config';
import type { AppNotification } from '../types';
import { mobileService } from './mobileService';

const SEEN_STORAGE_KEY = 'farmbridge_seen_push_ids';
const PUSH_PREF_KEY = 'farmbridge_push_enabled';

export interface ClientPushState {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  enabled: boolean;
  provider: 'fcm' | 'web_notification' | 'capacitor_local' | 'none';
  token?: string;
}

class ClientPushNotificationService {
  private seenIds: Set<string> = new Set();
  private sessionStartedAt = Date.now();
  private swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
  private foregroundToastListeners: Set<(notif: AppNotification) => void> = new Set();
  private messagingUnsub: (() => void) | null = null;

  constructor() {
    this.loadSeenIds();
  }

  private loadSeenIds() {
    try {
      const raw = sessionStorage.getItem(SEEN_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach(id => this.seenIds.add(String(id)));
        }
      }
    } catch {
      // ignore
    }
  }

  private markSeen(id: string) {
    this.seenIds.add(id);
    try {
      const recent = Array.from(this.seenIds).slice(-120);
      sessionStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // ignore
    }
  }

  public onIncomingPushToast(listener: (notif: AppNotification) => void): () => void {
    this.foregroundToastListeners.add(listener);
    return () => {
      this.foregroundToastListeners.delete(listener);
    };
  }

  public isUserPushEnabled(): boolean {
    try {
      const saved = localStorage.getItem(PUSH_PREF_KEY);
      return saved !== 'false';
    } catch {
      return true;
    }
  }

  public setUserPushEnabled(enabled: boolean) {
    try {
      localStorage.setItem(PUSH_PREF_KEY, enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    if (!this.swRegistrationPromise) {
      this.swRegistrationPromise = navigator.serviceWorker
        .register('/firebase-messaging-sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('Service worker registration skipped:', err?.message || err);
          return null;
        });
    }
    return this.swRegistrationPromise;
  }

  public async initializeForUser(userId: string, requestBrowserPrompt = false): Promise<ClientPushState> {
    if (!userId) {
      return {
        supported: false,
        permission: this.getPermissionStatus(),
        enabled: false,
        provider: 'none'
      };
    }

    const platform = mobileService.isNative() ? 'android' : 'web';
    const browserSupported = typeof window !== 'undefined' && 'Notification' in window;
    let permission: NotificationPermission | 'unsupported' = this.getPermissionStatus();

    if (browserSupported && requestBrowserPrompt && permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        // ignore permission prompt error
      }
    }

    const swReg = await this.registerServiceWorker();
    let fcmToken: string | undefined;
    let provider: ClientPushState['provider'] = 'web_notification';

    // Try real FCM Web Push token acquisition when VAPID key & Push API are available
    const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
    if (permission === 'granted' && swReg && vapidKey) {
      try {
        const supported = await isSupported();
        if (supported) {
          const messaging = getMessaging(app);
          const token = await getToken(messaging, {
            vapidKey: String(vapidKey),
            serviceWorkerRegistration: swReg
          });
          if (token) {
            fcmToken = token;
            provider = 'fcm';
          }
          if (!this.messagingUnsub) {
            this.messagingUnsub = onMessage(messaging, (payload) => {
              const title = payload.notification?.title || payload.data?.title || 'FarmBridge Order Update';
              const body = payload.notification?.body || payload.data?.body || '';
              if (title && body) {
                this.showDeviceBanner(title, body, payload.data?.orderId);
              }
            });
          }
        }
      } catch (err) {
        console.warn('FCM getToken fallback to browser/realtime push:', (err as Error)?.message);
      }
    }

    const finalToken = fcmToken || `${platform}-notif-${userId}`;
    const enabled = this.isUserPushEnabled() && (permission === 'granted' || platform === 'android');

    // Persist subscription to backend Push Service & Cloud Firestore pushTokens
    try {
      await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token: finalToken,
          platform,
          provider,
          enabled
        })
      });
    } catch {
      // non-fatal
    }

    try {
      const docId = `${userId}_${platform}`;
      await setDoc(
        doc(db, 'pushTokens', docId),
        {
          id: docId,
          userId,
          token: finalToken,
          platform,
          provider,
          enabled,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch {
      // ignore if user isn't signed in to Firebase Auth (e.g. legacy session)
    }

    return {
      supported: browserSupported || platform === 'android',
      permission,
      enabled,
      provider: enabled ? provider : 'none',
      token: finalToken
    };
  }

  public async disableForUser(userId: string): Promise<void> {
    this.setUserPushEnabled(false);
    try {
      await fetch('/api/push/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch {
      // ignore
    }
    try {
      await deleteDoc(doc(db, 'pushTokens', `${userId}_web`));
    } catch {
      // ignore
    }
  }

  public async triggerRemotePushDispatch(params: {
    userId: string;
    title: string;
    body: string;
    type?: 'order' | 'message' | 'system';
    link?: string;
    data?: Record<string, string>;
  }): Promise<void> {
    if (!params.userId || !params.title || !params.body) return;
    try {
      await fetch('/api/push/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
    } catch {
      // ignore network failure cleanly
    }
  }

  public presentRealtimeOrderNotification(notif: AppNotification): void {
    if (!notif?.id || this.seenIds.has(notif.id)) return;
    this.markSeen(notif.id);

    // Only pop live alert banners for fresh unread notifications created recently
    const createdMs = new Date(notif.createdAt).getTime();
    const isFresh =
      !notif.read &&
      Number.isFinite(createdMs) &&
      createdMs >= this.sessionStartedAt - 15000;

    if (!isFresh || !this.isUserPushEnabled()) return;

    // Trigger in-app Liquid Glass push toast
    this.foregroundToastListeners.forEach(listener => {
      try {
        listener(notif);
      } catch {
        // ignore listener error
      }
    });

    // Show OS / Browser / Capacitor notification banner
    this.showDeviceBanner(notif.title, notif.message, notif.metadata?.orderId);
  }

  private async showDeviceBanner(title: string, body: string, orderId?: string) {
    mobileService.triggerHaptic('success').catch(() => {});

    if (mobileService.isNative()) {
      await mobileService.scheduleNotification(title, body);
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const reg = await this.registerServiceWorker();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/assets/farmbridge-logo-white.png',
          badge: '/assets/farmbridge-logo-white.png',
          tag: orderId ? `farmbridge-order-${orderId}` : 'farmbridge-order-alert',
          data: { url: '/#orders', orderId }
        });
        return;
      }
    } catch {
      // fall through to standard window Notification
    }

    try {
      new Notification(title, {
        body,
        icon: '/assets/farmbridge-logo-white.png',
        tag: orderId ? `farmbridge-order-${orderId}` : 'farmbridge-order-alert'
      });
    } catch {
      // ignore on restrictive WebViews
    }
  }
}

export const pushNotificationService = new ClientPushNotificationService();
