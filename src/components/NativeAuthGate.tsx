'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { subscribeAuth, type Session } from '@/lib/auth';

/**
 * Native-only startup screen: inside the app users must sign in or create an
 * account first. Rendered as a fully opaque full-screen view (not an overlay)
 * gated purely in JS — no CSS display class — so it can't bleed through onto
 * the home screen. The auth/legal pages stay reachable so people can log in.
 */
export function NativeAuthGate() {
  const pathname = usePathname() || '/';
  const [native, setNative] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let off = false;
    import('@capacitor/core').then(({ Capacitor }) => { if (!off) setNative(Capacitor.isNativePlatform()); });
    const unsub = subscribeAuth((s) => setSession(s)); // null = resolved + signed out
    return () => { off = true; unsub(); };
  }, []);

  const onAuthPath =
    pathname.startsWith('/register') || pathname.startsWith('/auth') ||
    pathname.startsWith('/terms') || pathname.startsWith('/privacy');

  if (native !== true) return null;        // web (or not yet determined) is open
  if (session === undefined) return null;  // auth not resolved yet — no flash
  if (session) return null;                // signed in
  if (onAuthPath) return null;             // allow the login/register flow

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: 'rgb(var(--ink))', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(240,195,85,0.16),transparent_60%)]" />
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <img src="/logo.svg" alt="MyHumidor" className="mb-8 h-14 w-auto" />
        <h1 className="font-display text-4xl leading-tight tracking-tightest">
          Your humidor,<br /><span className="italic text-ember-400">everywhere.</span>
        </h1>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-smoke-300">
          Sign in to rate cigars, track your humidor, check in at lounges, and follow other aficionados.
        </p>
        <div className="mt-8 w-full max-w-xs space-y-3">
          <Link href="/register?mode=signup" className="block w-full rounded-xl bg-ember-400 py-3.5 text-sm font-semibold text-paper active:bg-ember-600">
            Create an account
          </Link>
          <Link href="/register" className="block w-full rounded-xl border-[0.5px] border-ember-400/30 py-3.5 text-sm font-medium text-ember-100 active:bg-ember-400/10">
            I already have an account
          </Link>
        </div>
      </div>
      <div className="relative px-8 pb-6 text-center text-[11px] text-smoke-500">
        By continuing you agree to MyHumidor’s{' '}
        <Link href="/terms" className="text-smoke-300 underline">Terms</Link> and{' '}
        <Link href="/privacy" className="text-smoke-300 underline">Privacy Policy</Link>.
      </div>
    </div>
  );
}
