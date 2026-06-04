'use client';

import { useEffect, useRef } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { THREE?: any; VANTA?: any }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Subtle WebGL backdrop behind the badge case. Loaded from CDN at runtime so it
 * never bloats the bundle or breaks SSR. Fails silently to a flat background.
 */
export function VantaBackdrop({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.halo.min.js');
        if (cancelled || !ref.current || !window.VANTA?.HALO) return;
        effectRef.current = window.VANTA.HALO({
          el: ref.current,
          THREE: window.THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          baseColor: 0x2a1409,
          backgroundColor: 0x140a05,
          amplitudeFactor: 1.4,
          size: 1.3,
        });
      } catch {
        /* CDN blocked / offline — flat background is fine */
      }
    })();
    return () => {
      cancelled = true;
      try { effectRef.current?.destroy?.(); } catch { /* ignore */ }
    };
  }, []);

  return <div ref={ref} className={className} aria-hidden />;
}
