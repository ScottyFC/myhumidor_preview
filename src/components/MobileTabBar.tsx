'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Search, Box, Store, Cigarette, Package, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeAuth, type Session } from '@/lib/auth';

type Tab = { href: string; label: string; icon: typeof Home; match: (p: string) => boolean };

const CONSUMER: Tab[] = [
  { href: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { href: '/search', label: 'Search', icon: Search, match: (p) => p.startsWith('/search') },
  { href: '/top', label: 'Cigars', icon: Cigarette, match: (p) => p.startsWith('/top') || p.startsWith('/cigars') || p.startsWith('/brands') },
  { href: '/humidor', label: 'Humidor', icon: Box, match: (p) => p.startsWith('/humidor') },
  { href: '/lounges', label: 'Lounges', icon: Store, match: (p) => p.startsWith('/lounges') || p.startsWith('/map') },
  { href: '/feed', label: 'Feed', icon: Newspaper, match: (p) => p.startsWith('/feed') },
];

const LOUNGE: Tab[] = [
  { href: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { href: '/search', label: 'Search', icon: Search, match: (p) => p.startsWith('/search') },
  { href: '/top', label: 'Cigars', icon: Cigarette, match: (p) => p.startsWith('/top') || p.startsWith('/cigars') || p.startsWith('/brands') },
  { href: '/dashboard', label: 'Inventory', icon: Package, match: (p) => p.startsWith('/dashboard') },
  { href: '/lounges', label: 'Lounges', icon: Store, match: (p) => p.startsWith('/lounges') || p.startsWith('/map') },
  { href: '/feed', label: 'Feed', icon: Newspaper, match: (p) => p.startsWith('/feed') },
];

/**
 * Bottom tab bar — primary navigation inside the native app. Five evenly-sized
 * columns (CSS grid) so icons + labels are spaced uniformly. Profile lives in
 * the top-left of the top bar instead. Hidden on web (`.native-only`).
 */
export function MobileTabBar() {
  const pathname = usePathname() || '/';
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => subscribeAuth(setSession), []);

  const tabs = session?.type === 'retailer' ? LOUNGE : CONSUMER;

  return (
    <nav className="native-only native-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-ember-400/15 bg-ink/95 backdrop-blur-lg">
      <div className="grid w-full grid-cols-6">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-ember-300' : 'text-smoke-400 active:text-ember-100'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} className={active ? 'text-ember-400' : ''} />
              <span className="leading-none">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
