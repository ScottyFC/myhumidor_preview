'use client';

import { useCallback, useEffect, useRef } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LdYPygtAAAAAE9E7sI_IX0gzzlgpUW0AEurUrOS';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { grecaptcha?: any } }

/** Google reCAPTCHA v2 checkbox (explicit render — reliable in SPAs and the
 *  Capacitor webview). Calls onToken with the token, or null when it expires. */
export function Recaptcha({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);

  const render = useCallback(() => {
    const g = window.grecaptcha;
    if (!g?.render || !ref.current || widgetId.current !== null) return;
    widgetId.current = g.render(ref.current, {
      sitekey: SITE_KEY,
      theme: 'dark',
      callback: (token: string) => onToken(token),
      'expired-callback': () => onToken(null),
      'error-callback': () => onToken(null),
    });
  }, [onToken]);

  useEffect(() => {
    if (window.grecaptcha?.render) { render(); return; }
    const id = 'recaptcha-api';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id; s.src = 'https://www.google.com/recaptcha/api.js?render=explicit'; s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
    const iv = setInterval(() => { if (window.grecaptcha?.render) { clearInterval(iv); render(); } }, 200);
    return () => clearInterval(iv);
  }, [render]);

  return <div ref={ref} className="mt-1" />;
}
