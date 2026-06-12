'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getSession } from '@/lib/auth';

/**
 * First-party analytics beacon. Logs a 'view' on every route change and a
 * 'leave' (with time-on-page) when the visitor navigates away or hides the
 * tab — sendBeacon so it survives page unload. Session id lives in
 * sessionStorage; entity type/slug are derived from the path so the backend
 * can rank most-viewed cigars, lounges, and brands.
 */
export function Analytics() {
  const pathname = usePathname();
  const enteredAt = useRef<number>(Date.now());
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const sid = sessionId();

    // close out the previous page
    if (lastPath.current && lastPath.current !== pathname) {
      send({ sid, event: 'leave', path: lastPath.current, durationMs: Date.now() - enteredAt.current });
    }
    enteredAt.current = Date.now();
    lastPath.current = pathname;
    send({ sid, event: 'view', path: pathname, referrer: document.referrer || null });

    const onHide = () => {
      if (document.visibilityState === 'hidden' && lastPath.current) {
        send({ sid, event: 'leave', path: lastPath.current, durationMs: Date.now() - enteredAt.current }, true);
        enteredAt.current = Date.now(); // returning to the tab restarts the clock
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [pathname]);

  return null;
}

function sessionId(): string {
  try {
    let sid = sessionStorage.getItem('mh_sid');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('mh_sid', sid);
    }
    return sid;
  } catch {
    return 'anon';
  }
}

function entityFromPath(path: string): { entityType: string | null; entityId: string | null } {
  const m = path.match(/^\/(cigars|lounges|brands)\/([^/?#]+)/);
  if (!m) return { entityType: null, entityId: null };
  const type = m[1] === 'cigars' ? 'cigar' : m[1] === 'lounges' ? 'lounge' : 'brand';
  return { entityType: type, entityId: decodeURIComponent(m[2]) };
}

function send(
  data: { sid: string; event: 'view' | 'leave'; path: string; durationMs?: number; referrer?: string | null },
  beacon = false,
) {
  const payload = JSON.stringify({
    ...data,
    ...entityFromPath(data.path),
    userId: getSession()?.uuid ?? null,
  });
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
    }
  } catch { /* analytics never breaks the app */ }
}
