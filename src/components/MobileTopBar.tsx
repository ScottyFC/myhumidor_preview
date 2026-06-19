'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, User, Settings, LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { signOut } from '@/lib/auth';

const AUTH_ROUTES = ['/register', '/auth', '/terms', '/privacy'];

/**
 * Slim native top bar inside the Capacitor app — wordmark, notifications, and a
 * settings menu (account + log out), with a contextual back chevron on detail
 * pages. Hidden on web (`.native-only`) and on the login/auth screens.
 */
export function MobileTopBar() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // No top bar on the login / auth / legal screens.
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) return null;

  const isRoot = ['/', '/search', '/humidor', '/lounges', '/profile', '/dashboard', '/top', '/map'].includes(pathname);

  async function logout() {
    setMenuOpen(false);
    await signOut();
    router.push('/');
  }

  return (
    <header className="native-only native-topbar fixed inset-x-0 top-0 z-40 items-center justify-between border-b border-ember-400/15 bg-ink/95 px-3 backdrop-blur-lg">
      <div className="flex h-14 w-full items-center justify-between">
        <div className="flex min-w-0 items-center gap-1">
          {!isRoot && (
            <button onClick={() => router.back()} aria-label="Back" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-smoke-200 active:bg-ember-400/10">
              <ChevronLeft size={24} strokeWidth={1.75} />
            </button>
          )}
          <Link href="/profile" aria-label="Profile" className="flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-ember-400/30 bg-char/60 text-ember-200 active:bg-ember-400/10">
            <User size={18} strokeWidth={1.75} />
          </Link>
        </div>

        <Link href="/" aria-label="MyHumidor home" className="flex items-center">
          <img src="/logo.svg" alt="MyHumidor" className="h-7 w-auto" />
        </Link>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-full text-smoke-200 active:bg-ember-400/10">
              <Settings size={20} strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border-[0.5px] border-ember-400/20 bg-char/95 py-1 shadow-xl backdrop-blur-lg">
                <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-smoke-200 active:bg-ember-400/10">
                  <Settings size={15} strokeWidth={1.5} className="text-ember-300" /> Account settings
                </Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-smoke-200 active:bg-ember-400/10">
                  <User size={15} strokeWidth={1.5} className="text-ember-300" /> Notifications
                </Link>
                <button onClick={logout} className="flex w-full items-center gap-2 border-t border-ember-400/10 px-4 py-2.5 text-left text-sm text-smoke-200 active:bg-ember-400/10">
                  <LogOut size={15} strokeWidth={1.5} className="text-ember-300" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
