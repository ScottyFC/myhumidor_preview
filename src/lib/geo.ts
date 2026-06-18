/**
 * Cross-platform geolocation. On the web it uses the browser API; inside the
 * native app it uses the Capacitor Geolocation plugin so the OS permission
 * prompt fires and works in the webview. Returns null if unavailable/denied.
 *
 * NATIVE SETUP REQUIRED (done in the native projects, not here):
 *  - iOS: add `NSLocationWhenInUseUsageDescription` to Info.plist.
 *  - Android: add ACCESS_COARSE_LOCATION + ACCESS_FINE_LOCATION to the manifest.
 */
export type LocationResult = { lat: number; lng: number } | { error: 'denied' | 'unsupported' | 'timeout' };

export async function getUserLocation(): Promise<LocationResult> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      try {
        const perm = await Geolocation.requestPermissions();
        if (perm.location === 'denied') return { error: 'denied' };
      } catch { /* some platforms resolve permission implicitly */ }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  } catch { /* fall through to browser API */ }

  if (typeof navigator === 'undefined' || !navigator.geolocation) return { error: 'unsupported' };
  return new Promise<LocationResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => resolve({ error: err.code === err.TIMEOUT ? 'timeout' : 'denied' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}
