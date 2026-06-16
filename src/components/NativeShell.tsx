'use client';

import { useEffect } from 'react';

/**
 * Native-only behaviors for the Capacitor shell. No-ops on the web (everything
 * is guarded by Capacitor.isNativePlatform()), so it's safe to mount in the
 * shared layout. Handles: hiding the launch splash once the app is interactive,
 * status-bar theming, Android hardware-back navigation, and deep links.
 */
export function NativeShell() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // @capacitor/core is browser-safe; isNativePlatform() is false on web.
      const { Capacitor } = await import('@capacitor/core');
      if (cancelled || !Capacitor.isNativePlatform()) return;

      // Flag the native shell so CSS can swap web chrome (header/footer) for the
      // app's top bar + bottom tab bar and apply safe-area insets.
      document.documentElement.classList.add('native-app');
      document.documentElement.classList.add(`native-${Capacitor.getPlatform()}`);

      // Status bar: light text on our dark UI.
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#14110d' });
        }
      } catch { /* plugin not available */ }

      // Hide the launch splash now that the web app has mounted.
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch { /* ignore */ }

      // Android hardware back: go back in history, exit at the root.
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else App.exitApp();
        });
        // Deep links (myhumidor.shop universal links / custom scheme) → route in-app.
        App.addListener('appUrlOpen', ({ url }) => {
          try {
            const u = new URL(url);
            const path = u.pathname + u.search + u.hash;
            if (path && path !== '/') window.location.assign(path);
          } catch { /* ignore malformed */ }
        });
      } catch { /* ignore */ }
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}
