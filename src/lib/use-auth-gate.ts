'use client';

import { useEffect, useRef } from 'react';
import { subscribeAuth } from '@/lib/auth';

/**
 * Auth gate for interactive actions. Like any real social platform, browsing
 * is open but *doing* (saving, rating, following, commenting, requesting)
 * requires an account. Wrap the action: `gate(() => doThing())` — signed-out
 * users are sent to /register with a `next` back to where they were.
 */
export function useAuthGate() {
  const signedIn = useRef<boolean | null>(null);
  useEffect(() => subscribeAuth((s) => { signedIn.current = !!s; }), []);

  function gate<T extends unknown[]>(fn: (...args: T) => void) {
    return (...args: T) => {
      if (signedIn.current === false) {
        const next = typeof window !== 'undefined'
          ? encodeURIComponent(window.location.pathname + window.location.search) : '';
        window.location.href = `/register?next=${next}`;
        return;
      }
      fn(...args);
    };
  }
  return gate;
}
