'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Search, Box, Store, User, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeAuth, type Session } from '@/lib/auth';

type Tab = { href: string; label: string; icon: typeof Home; match: (p: string) => boolean };

const CONSUMER: Tab[] = [
  { href: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { href: '/search', label: 'Search', icon: Search, match: (p) => p.startsWith('/search') || p.startsWith('/cigars') || p.startsWith('/top') },
  { href: '/humidor', label: 'Humidor', icon: Box, match: (p) => p.startsWith('/humidor') },
  { href: '/lounges', label: 'Lounges', icon: Store, match: (p) => p.startsWith('/lounges') || p.startsWith('/map') },
  { href: '/profile', label: 'Profile', icon: User, match: (p) => p.startsWith('/profile') || p.startsWith('/u/') },
];

const LOUNGE: Tab[] = [
  { href: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { href: '/search', label: 'Search', icon: Search, match: (p) => p.startsWith('/search') || p.startsWith('/cigars') || p.startsWith('/top') },
  { href: '/dashboard', label: 'Inventory', icon: Package, match: (p) => p.startsWith('/dashboard') },
  { href: '/lounges', label: 'Lounges', icon: Store, match: (p) => p.startsWith('/lounges') || p.startsWith('/map') },
  { href: '/profile', label: 'Profile', icon: User, match: (p) => p.startsWith('/profile') },
];

/**
 * Bottom tab bar — the primary navigation inside the native app. Hidden on the
 * web via the `.native-only` class (only shown when the Capacitor shell adds
 * `.native-app` to <html>).
 */
export function MobileTabBar() {
  const pathname = usePathname() || '/';
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => subscribeAuth(setSession), []);

  const tabs = session?.type === 'retailer' ? LOUNGE : CONSUMER;

  return (
    <nav className="native-only native-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-ember-400/15 bg-ink/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium tracking-wide transition-colors',
                active ? 'text-ember-300' : 'text-smoke-400 active:text-ember-100'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} className={active ? 'text-ember-400' : ''} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
