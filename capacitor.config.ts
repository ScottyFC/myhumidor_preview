import type { CapacitorConfig } from '@capacitor/cli';

/**
 * MyHumidor ships as a Capacitor shell around the hosted Next.js app. Because
 * the app is server-rendered (server components, /api routes, cookie-based
 * Supabase auth), the native app loads the production URL directly — everything
 * keeps working exactly as on the web, and we layer native splash, status-bar
 * theming, hardware-back and deep links on top.
 *
 * To test against a local dev server instead, set CAP_SERVER_URL, e.g.
 *   CAP_SERVER_URL=http://192.168.1.20:3000 npx cap run ios
 */
const SERVER_URL = process.env.CAP_SERVER_URL || 'https://www.myhumidor.shop';

const config: CapacitorConfig = {
  appId: 'shop.myhumidor.app',
  appName: 'MyHumidor',
  // Unused at runtime when server.url is set, but cap copy needs a valid dir.
  webDir: 'mobile/www',
  backgroundColor: '#14110d', // brand "ink"
  server: {
    url: SERVER_URL,
    cleartext: false,
    // Allow navigation within our own domains (auth redirects, Supabase, CDN).
    allowNavigation: [
      'www.myhumidor.shop',
      'myhumidor.shop',
      '*.supabase.co',
      'd3h1d86sioogzh.cloudfront.net',
    ],
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#14110d',
  },
  android: {
    backgroundColor: '#14110d',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false, // we hide it from JS once the app is interactive
      backgroundColor: '#14110d',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK', // dark content style → light text on our dark UI
      backgroundColor: '#14110d',
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
