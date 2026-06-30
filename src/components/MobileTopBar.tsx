'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, User, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { signOut } from '@/lib/auth';
import { getProfile, ensureProfile, onProfileChange } from '@/lib/profile';

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
  const [avatar, setAvatar] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sync = () => setAvatar(getProfile().avatarDataUrl);
    ensureProfile().then(sync).catch(() => {});
    return onProfileChange(sync);
  }, []);
  const [dark, setDark] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  function toggleTheme() {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle('dark', next);
      try { localStorage.setItem('mh-theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
      return next;
    });
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // No top bar on the login / auth / legal screens.
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) return null;

  const isRoot = ['/', '/search', '/humidor', '/lounges', '/profile', '/dashboard', '/top'].includes(pathname);

  async function logout() {
    setMenuOpen(false);
    await signOut();
    router.push('/');
  }

  return (
    <header className="native-only native-topbar fixed inset-x-0 top-0 z-50 items-center justify-between border-b border-white/10 bg-ink/45 px-3 backdrop-blur-2xl backdrop-saturate-150">
      <div className="relative flex h-14 w-full items-center justify-between">
        <div className="flex min-w-0 items-center gap-1">
          {!isRoot && (
            <button onClick={() => router.back()} aria-label="Back" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-smoke-200 active:bg-ember-400/10">
              <ChevronLeft size={24} strokeWidth={1.75} />
            </button>
          )}
          <Link href="/profile" aria-label="Profile" className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-[0.5px] border-ember-400/30 bg-char/60 text-ember-200 active:bg-ember-400/10">
            {avatar
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={avatar} alt="" className="h-full w-full object-cover" />
              : <User size={18} strokeWidth={1.75} />}
          </Link>
        </div>

        <Link href="/" aria-label="MyHumidor home" className="absolute left-1/2 flex -translate-x-1/2 items-center">
          <img src="/logo.svg" alt="MyHumidor" className="h-7 w-auto" />
        </Link>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-full text-smoke-200 active:bg-ember-400/10">
              <Settings size={20} strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-2xl border border-white/12 bg-ink/70 py-1 shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
                <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-smoke-200 active:bg-ember-400/10">
                  <Settings size={15} strokeWidth={1.5} className="text-ember-300" /> Account settings
                </Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-smoke-200 active:bg-ember-400/10">
                  <User size={15} strokeWidth={1.5} className="text-ember-300" /> Notifications
                </Link>
                <button onClick={toggleTheme} className="flex w-full items-center gap-2 border-t border-ember-400/10 px-4 py-2.5 text-left text-sm text-smoke-200 active:bg-ember-400/10">
                  {dark ? <Sun size={15} strokeWidth={1.5} className="text-ember-300" /> : <Moon size={15} strokeWidth={1.5} className="text-ember-300" />}
                  {dark ? 'Light mode' : 'Dark mode'}
                </button>
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
