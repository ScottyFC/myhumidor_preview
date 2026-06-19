'use client';

import { useEffect, useRef, useState } from 'react';

/** Full-screen video splash shown once when the native app opens. Plays
 *  /AppSplash.mp4, then fades out. No-op on the web. */
export function SplashVideo() {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);
  const vid = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (cancelled || !Capacitor.isNativePlatform()) return;
        if (sessionStorage.getItem('mh:splash-shown') === '1') return;
        sessionStorage.setItem('mh:splash-shown', '1');
        setShow(true);
      } catch { /* web — no splash */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!show) return;
    // Swap the static Capacitor splash for our video.
    (async () => { try { const { SplashScreen } = await import('@capacitor/splash-screen'); await SplashScreen.hide(); } catch { /* ignore */ } })();
    const v = vid.current;
    const finish = () => { setFading(true); setTimeout(() => setShow(false), 500); };
    const maxTimer = setTimeout(finish, 8000); // safety cap
    if (v) { v.play?.().catch(() => {}); v.onended = finish; }
    return () => clearTimeout(maxTimer);
  }, [show]);

  if (!show) return null;
  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-ink transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
      aria-hidden
      onClick={() => { setFading(true); setTimeout(() => setShow(false), 500); }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={vid} src="/AppSplash.mp4" autoPlay muted playsInline className="h-full w-full object-cover" />
    </div>
  );
}
