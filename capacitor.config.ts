import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'market.agrox.app',
  appName: 'agroX',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#14532D',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#14532D'
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_agrox',
      iconColor: '#16A34A',
      sound: 'beep.wav'
    },
    Camera: {
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;
