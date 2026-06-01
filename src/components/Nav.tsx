'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Search, MapPin, User, Flame, Store, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { subscribeAuth, signOut, type Session } from '@/lib/auth';
import { isAdmin, onAdminsChange } from '@/lib/admin';

const TABS = [
  { href: '/humidor', label: 'Humidor', icon: Box },
  { href: '/top', label: 'Top Cigars', icon: Flame },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/map', label: 'Map', icon: MapPin },
  { href: '/lounges', label: 'Lounges', icon: Store },
];

export function Nav() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [, bumpAdmin] = useState(0);

  useEffect(() => {
    return subscribeAuth(setSession);
  }, []);

  useEffect(() => onAdminsChange(() => bumpAdmin((n) => n + 1)), []);

  // Humidor requires an account — send signed-out users to register.
  const tabHref = (href: string) =>
    href === '/humidor' && !session ? '/register?next=/humidor' : href;

  return (
    <header className="sticky top-0 z-50 border-b border-ember-400/15 bg-char/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="MyHumidor" className="h-8 w-auto" />
          <span className="hidden text-[10px] uppercase tracking-widest text-smoke-400 lg:inline">
            by CigarTV
          </span>
        </Link>

        {/* Desktop search with autocomplete */}
        <SearchAutocomplete className="hidden flex-1 md:block" />

        <nav className="hidden items-center gap-1 md:flex">
          {TABS.filter((t) => t.href !== '/search').map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tabHref(tab.href)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition',
                  active
                    ? 'text-ember-100 bg-ember-400/10'
                    : 'text-smoke-200 hover:bg-ember-400/5 hover:text-paper'
                )}
              >
                <Icon size={15} strokeWidth={1.5} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          {/* Mobile search icon */}
          <Link href="/search" aria-label="Search" className="btn-ghost p-2 md:hidden">
            <Search size={16} strokeWidth={1.5} />
          </Link>

          {session ? (
            <>
              {isAdmin(session.publicId) && (
                <Link href="/admin" className="btn-ghost text-xs" title="Moderation">
                  <ShieldCheck size={14} strokeWidth={1.5} className="text-ember-400" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              {session.type === 'lounge' && (
                <Link href="/dashboard" className="btn-ghost text-xs">
                  <LayoutDashboard size={14} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              )}
              <div className="flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/20 bg-char/60 py-1 pl-1 pr-1">
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-ember-400/10"
                  title="Your profile"
                >
                  <User size={14} strokeWidth={1.5} className="text-ember-100 sm:hidden" />
                  <span className="hidden text-xs sm:inline">
                    <span className="text-paper">{session.displayName}</span>
                    <span className="ml-1.5 rounded bg-ember-400/15 px-1 py-0.5 text-[9px] uppercase tracking-wider text-ember-100">
                      {session.type === 'lounge' ? 'Lounge' : 'Member'}
                    </span>
                  </span>
                </Link>
                <button
                  onClick={signOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex h-6 w-6 items-center justify-center rounded text-smoke-400 hover:text-paper"
                >
                  <LogOut size={14} strokeWidth={1.5} />
                </button>
              </div>
            </>
          ) : (
            <Link href="/register" className="btn-ghost text-xs">
              <User size={14} strokeWidth={1.5} />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="border-t border-ember-400/10 md:hidden">
        <div className="mx-auto flex max-w-7xl justify-around px-2 py-2">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tabHref(tab.href)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded px-3 py-1 text-[10px] uppercase tracking-wider',
                  active ? 'text-ember-400' : 'text-smoke-400'
                )}
              >
                <Icon size={18} strokeWidth={1.5} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
