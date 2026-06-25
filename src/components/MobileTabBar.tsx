'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Search, Box, Store, Cigarette, Package, Newspaper, LayoutGrid, Ticket, Boxes, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeAuth, type Session } from '@/lib/auth';

type Tab = { href: string; label: string; icon: typeof Home; match: (p: string) => boolean; tab?: string };

const CONSUMER: Tab[] = [
  { href: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { href: '/top', label: 'Cigars', icon: Cigarette, match: (p) => p.startsWith('/top') || p.startsWith('/cigars') || p.startsWith('/brands') },
  { href: '/search', label: 'Search', icon: Search, match: (p) => p.startsWith('/search') },
  { href: '/humidor', label: 'Humidor', icon: Box, match: (p) => p.startsWith('/humidor') },
  { href: '/lounges', label: 'Lounges', icon: Store, match: (p) => p.startsWith('/lounges') },
  { href: '/feed', label: 'Feed', icon: Newspaper, match: (p) => p.startsWith('/feed') },
];

// Mirrors the lounge dashboard tabs (LoungeHub). Deep-links via ?tab=.
const LOUNGE: Tab[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, tab: 'overview', match: (p) => p.startsWith('/dashboard') },
  { href: '/dashboard?tab=inventory', label: 'Inventory', icon: Package, tab: 'inventory', match: (p) => p.startsWith('/dashboard') },
  { href: '/dashboard?tab=preorders', label: 'Pre-orders', icon: Ticket, tab: 'preorders', match: (p) => p.startsWith('/dashboard') },
  { href: '/dashboard?tab=wholesale', label: 'Wholesale', icon: Boxes, tab: 'wholesale', match: (p) => p.startsWith('/dashboard') },
  { href: '/dashboard?tab=settings', label: 'Lounge', icon: SettingsIcon, tab: 'settings', match: (p) => p.startsWith('/dashboard') },
];

/**
 * Bottom tab bar — primary navigation inside the native app. Five evenly-sized
 * columns (CSS grid) so icons + labels are spaced uniformly. Profile lives in
 * the top-left of the top bar instead. Hidden on web (`.native-only`).
 */
export function MobileTabBar() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const currentTab = (searchParams?.get('tab')) || 'overview';
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => subscribeAuth(setSession), []);

  const tabs = session?.type === 'retailer' ? LOUNGE : CONSUMER;

  // No tab bar on the login / auth / legal screens.
  if (['/register', '/auth', '/terms', '/privacy'].some((r) => pathname.startsWith(r))) return null;

  return (
    <nav className="native-only native-tabbar fixed inset-x-0 bottom-0 z-50 bg-ink shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
      {/* Fade content out just above the bar so nothing leaks behind it. */}
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-ink to-transparent" />
      <div className="relative w-full border-t border-ember-400/20 bg-gradient-to-b from-char/30 to-ink">
      <div className={cn('grid w-full pt-1', tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-6')}>
        {tabs.map((t) => {
          const active = t.tab ? (pathname.startsWith('/dashboard') && currentTab === t.tab) : t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1 px-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors',
                active ? 'text-ember-300' : 'text-smoke-400 active:text-ember-100'
              )}
            >
              <Icon size={19} strokeWidth={active ? 2 : 1.5} className={active ? 'text-ember-400' : ''} />
              <span className="w-full truncate text-center leading-none">{t.label}</span>
            </Link>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
