import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';

class MobileService {
  private isNativeDevice = false;

  constructor() {
    this.checkPlatform();
  }

  private checkPlatform() {
    try {
      // @ts-ignore
      this.isNativeDevice = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
    } catch {
      this.isNativeDevice = false;
    }
  }

  public isNative(): boolean {
    return this.isNativeDevice;
  }

  /**
   * Initialize native Android UI: status bar color, hide splash screen
   */
  public async initMobileApp() {
    try {
      await SplashScreen.hide();
    } catch (e) {
      // Ignore if web
    }

    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#14532D' });
    } catch (e) {
      // Ignore if web
    }
  }

  /**
   * Take a photo using native Android Camera or Pick from Gallery
   */
  public async capturePhoto(source: 'camera' | 'photos' = 'camera'): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        promptLabelHeader: 'Select Produce Photo',
        promptLabelPhoto: 'Choose from Gallery',
        promptLabelPicture: 'Take a Photo'
      });

      this.triggerHaptic('light');
      return image.dataUrl || null;
    } catch (err: any) {
      console.warn('Native camera capture cancelled or failed:', err);
      return null;
    }
  }

  /**
   * Trigger native Android haptic feedback
   */
  public async triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
    try {
      if (type === 'light') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (type === 'medium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (type === 'heavy') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (type === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (type === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (type === 'error') {
        await Haptics.notification({ type: NotificationType.Error });
      }
    } catch (e) {
      // Web vibration fallback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(type === 'heavy' ? 40 : 15);
      }
    }
  }

  /**
   * Request notification permissions and schedule a local notification
   */
  public async scheduleNotification(title: string, body: string, id: number = Date.now() % 100000) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id,
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'beep.wav',
              smallIcon: 'ic_stat_agrox',
              iconColor: '#15803D'
            }
          ]
        });
      }
    } catch (e) {
      console.warn('LocalNotifications not supported on this platform:', e);
      // Browser notification fallback
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      }
    }
  }

  /**
   * Get device GPS coordinates
   */
  public async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (e) {
      console.warn('Geolocation capture failed or not permitted:', e);
      return null;
    }
  }

  /**
   * Register hardware back button listener for Android
   */
  public registerBackButton(handler: () => boolean | void) {
    try {
      return App.addListener('backButton', ({ canGoBack }) => {
        const handled = handler();
        if (!handled && canGoBack) {
          window.history.back();
        }
      });
    } catch {
      return { remove: () => {} };
    }
  }

  /**
   * Preferences Key-Value Storage (wraps Android SharedPreferences)
   */
  public async setStorageItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch {
      localStorage.setItem(key, value);
    }
  }

  public async getStorageItem(key: string): Promise<string | null> {
    try {
      const result = await Preferences.get({ key });
      return result.value;
    } catch {
      return localStorage.getItem(key);
    }
  }

  public async removeStorageItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch {
      localStorage.removeItem(key);
    }
  }
}

export const mobileService = new MobileService();
