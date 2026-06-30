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
  { href: '/lounges', label: 'Lounges & Shops', icon: Store, match: (p) => p.startsWith('/lounges') },
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
    <nav
      className="native-only fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
    >
      <div className="relative flex items-center gap-0.5 overflow-hidden rounded-full border border-white/15 bg-ink/55 px-2 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150">
        {/* specular top highlight — the liquid-glass sheen */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/12 to-transparent" />
        {tabs.map((t) => {
          const active = t.tab ? (pathname.startsWith('/dashboard') && currentTab === t.tab) : t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.label}
              className={cn(
                'relative flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                active ? 'text-ember-400' : 'text-smoke-300 active:text-ember-100'
              )}
            >
              {active && <span className="absolute inset-1 rounded-full bg-ember-400/15 ring-1 ring-ember-400/30" />}
              <Icon size={22} strokeWidth={active ? 2 : 1.6} className="relative" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
