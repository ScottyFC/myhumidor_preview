'use client';

import { useEffect, useRef } from 'react';
import { subscribeAuth, signOut } from '@/lib/auth';

const IDLE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Security: auto-logs out LOUNGE owners and BRAND operators after 15 minutes of
 * no activity. Standard consumer members are exempt (no timer is armed for them).
 * Role detection:
 *   - brand   → the non-httpOnly `mh_brand_csrf` cookie is present (set on brand login)
 *   - lounge  → the Supabase session resolves to a retailer account
 *   - else    → consumer (or signed out) → no auto-logout
 */
export function IdleLogout() {
  const role = useRef<'brand' | 'lounge' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isBrand = () => document.cookie.split('; ').some((c) => c.startsWith('mh_brand_csrf='));
    if (isBrand()) role.current = 'brand';

    async function logout() {
      if (role.current === 'brand') {
        try { await fetch('/api/brand-auth/logout', { method: 'POST' }); } catch { /* ignore */ }
        window.location.href = '/brand/login?timeout=1';
      } else if (role.current === 'lounge') {
        try { await signOut(); } catch { /* ignore */ }
        window.location.href = '/login?timeout=1';
      }
    }

    function arm() {
      if (timer.current) clearTimeout(timer.current);
      if (role.current === 'brand' || role.current === 'lounge') {
        timer.current = setTimeout(logout, IDLE_MS);
      }
    }

    const unsub = subscribeAuth((s) => {
      // a brand session takes precedence; otherwise a retailer Supabase session = lounge
      if (!isBrand()) role.current = s?.type === 'retailer' ? 'lounge' : null;
      arm();
    });

    let last = 0;
    function onActivity() {
      const now = Date.now();
      if (now - last < 1000) return; // throttle resets to once/sec
      last = now;
      arm();
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    arm();

    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, []);

  return null;
}
