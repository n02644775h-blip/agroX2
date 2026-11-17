import fs from 'fs';
import path from 'path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export type PushPlatform = 'web' | 'android' | 'ios';

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  provider: 'fcm' | 'web_notification' | 'capacitor_local';
  enabled: boolean;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushDispatchRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'order' | 'message' | 'system';
  orderId?: string;
  orderNumber?: string;
  status?: string;
  deliveryMode: 'fcm_multicast' | 'realtime_fallback';
  fcmSuccessCount: number;
  fcmFailureCount: number;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

class PushNotificationService {
  private subscriptions: PushSubscriptionRecord[] = [];
  private dispatchLog: PushDispatchRecord[] = [];
  private firebaseAdminChecked = false;
  private firebaseAdminAvailable = false;

  constructor() {
    this.loadSubscriptions();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadSubscriptions() {
    try {
      this.ensureDir();
      if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
        const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.subscriptions = parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load push subscriptions:', err);
      this.subscriptions = [];
    }
  }

  private persistSubscriptions() {
    try {
      this.ensureDir();
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(this.subscriptions, null, 2), 'utf8');
    } catch (err) {
      console.warn('Failed to persist push subscriptions:', err);
    }
  }

  private ensureFirebaseAdmin(): boolean {
    if (this.firebaseAdminChecked) {
      return this.firebaseAdminAvailable;
    }
    this.firebaseAdminChecked = true;
    try {
      if (getApps().length > 0) {
        this.firebaseAdminAvailable = true;
        return true;
      }
      const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
      if (!rawJson) {
        this.firebaseAdminAvailable = false;
        return false;
      }
      const serviceAccount = JSON.parse(rawJson);
      initializeApp({
        credential: cert(serviceAccount)
      });
      this.firebaseAdminAvailable = true;
      return true;
    } catch (err) {
      console.warn('Firebase Admin Messaging initialization skipped:', (err as Error)?.message);
      this.firebaseAdminAvailable = false;
      return false;
    }
  }

  getStatus(userId?: string) {
    const fcmConfigured = this.ensureFirebaseAdmin();
    const userSubs = userId
      ? this.subscriptions.filter(s => s.userId === userId && s.enabled)
      : this.subscriptions.filter(s => s.enabled);

    return {
      fcmAdminConfigured: fcmConfigured,
      deliveryMode: fcmConfigured ? 'fcm_and_realtime' : 'realtime_and_browser_push',
      registeredDevices: userSubs.length,
      fcmTokenCount: userSubs.filter(s => s.provider === 'fcm').length,
      recentDispatches: userId
        ? this.dispatchLog.filter(d => d.userId === userId).slice(0, 15)
        : this.dispatchLog.slice(0, 25)
    };
  }

  registerSubscription(params: {
    userId: string;
    token: string;
    platform?: PushPlatform;
    provider?: PushSubscriptionRecord['provider'];
    enabled?: boolean;
    userAgent?: string;
  }): PushSubscriptionRecord {
    const cleanUserId = params.userId.trim();
    const cleanToken = params.token.trim();
    const now = new Date().toISOString();

    const existingIdx = this.subscriptions.findIndex(
      s => s.userId === cleanUserId && s.token === cleanToken
    );

    const record: PushSubscriptionRecord = {
      id: existingIdx >= 0 ? this.subscriptions[existingIdx].id : `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: cleanUserId,
      token: cleanToken,
      platform: params.platform || 'web',
      provider: params.provider || (cleanToken.startsWith('web-notif-') ? 'web_notification' : 'fcm'),
      enabled: params.enabled !== undefined ? Boolean(params.enabled) : true,
      userAgent: params.userAgent,
      createdAt: existingIdx >= 0 ? this.subscriptions[existingIdx].createdAt : now,
      updatedAt: now
    };

    if (existingIdx >= 0) {
      this.subscriptions[existingIdx] = record;
    } else {
      this.subscriptions.unshift(record);
    }
    this.persistSubscriptions();
    return record;
  }

  unregisterSubscription(userId: string, token?: string): { removed: number } {
    const before = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter(s => {
      if (s.userId !== userId) return true;
      if (token && s.token !== token) return true;
      return false;
    });
    const removed = before - this.subscriptions.length;
    if (removed > 0) {
      this.persistSubscriptions();
    }
    return { removed };
  }

  async dispatchPushToUser(params: {
    userId: string;
    title: string;
    body: string;
    type?: 'order' | 'message' | 'system';
    link?: string;
    data?: Record<string, string>;
  }): Promise<PushDispatchRecord> {
    const now = new Date().toISOString();
    const activeFcmTokens = this.subscriptions
      .filter(s => s.userId === params.userId && s.enabled && s.provider === 'fcm' && s.token)
      .map(s => s.token);

    let fcmSuccessCount = 0;
    let fcmFailureCount = 0;
    let deliveryMode: PushDispatchRecord['deliveryMode'] = 'realtime_fallback';

    if (activeFcmTokens.length > 0 && this.ensureFirebaseAdmin()) {
      deliveryMode = 'fcm_multicast';
      try {
        const stringData: Record<string, string> = {
          type: params.type || 'order',
          link: params.link || '/#orders',
          title: params.title,
          body: params.body,
          ...(params.data || {})
        };

        const response = await getMessaging().sendEachForMulticast({
          tokens: activeFcmTokens,
          notification: {
            title: params.title,
            body: params.body
          },
          data: stringData,
          webpush: {
            fcmOptions: {
              link: params.link || '/#orders'
            },
            notification: {
              title: params.title,
              body: params.body,
              icon: '/assets/farmbridge-logo-white.png',
              badge: '/assets/farmbridge-logo-white.png'
            }
          },
          android: {
            priority: 'high',
            notification: {
              title: params.title,
              body: params.body,
              channelId: 'farmbridge_orders',
              color: '#145A38'
            }
          }
        });

        fcmSuccessCount = response.successCount;
        fcmFailureCount = response.failureCount;

        // Clean up invalid / expired registration tokens
        const staleTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          const code = resp.error?.code;
          if (
            !resp.success &&
            (code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token')
          ) {
            staleTokens.push(activeFcmTokens[idx]);
          }
        });
        if (staleTokens.length > 0) {
          this.subscriptions = this.subscriptions.filter(s => !staleTokens.includes(s.token));
          this.persistSubscriptions();
        }
      } catch (err) {
        console.warn('FCM multicast dispatch failed cleanly (falling back to real-time notification):', err);
        fcmFailureCount = activeFcmTokens.length;
      }
    }

    const logEntry: PushDispatchRecord = {
      id: `pdisp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: params.type || 'order',
      orderId: params.data?.orderId,
      orderNumber: params.data?.orderNumber,
      status: params.data?.status,
      deliveryMode,
      fcmSuccessCount,
      fcmFailureCount,
      createdAt: now
    };

    this.dispatchLog.unshift(logEntry);
    if (this.dispatchLog.length > 200) {
      this.dispatchLog.length = 200;
    }

    return logEntry;
  }
}

export const pushService = new PushNotificationService();
