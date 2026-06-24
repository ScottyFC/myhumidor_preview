'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Search, MapPin, User, Flame, Store, LayoutDashboard, LogOut, ShieldCheck, ChevronDown, Cigarette, Settings, Bell, Package, Newspaper, CreditCard, Sun, Moon } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { subscribeAuth, signOut, type Session } from '@/lib/auth';
import { getMyLounges } from '@/lib/lounges-owner';
import { getMyBrands, brandLogout } from '@/lib/brands';
import { isAdmin, onAdminsChange } from '@/lib/admin';

const CONSUMER_TABS = [
  { href: '/humidor', label: 'Humidor', icon: Box },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/top', label: 'Cigars', icon: Flame },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/lounges', label: 'Lounges', icon: Store },
];

const LOUNGE_TABS = [
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/top', label: 'Cigars', icon: Flame },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/lounges', label: 'Lounges', icon: Store },
];

export function Nav() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, bumpAdmin] = useState(0);
  const [loungeSlug, setLoungeSlug] = useState<string | null>(null);
  const [loungeDone, setLoungeDone] = useState(false); // verified → hide the Verify entry points
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  function toggleTheme() { setDark((d) => { const n = !d; document.documentElement.classList.toggle('dark', n); try { localStorage.setItem('mh-theme', n ? 'dark' : 'light'); } catch {} return n; }); }

  useEffect(() => {
    return subscribeAuth(setSession);
  }, []);

  useEffect(() => onAdminsChange(() => bumpAdmin((n) => n + 1)), []);

  const isLounge = session?.type === 'retailer';

  useEffect(() => {
    if (!isLounge) { setLoungeSlug(null); setLoungeDone(false); return; }
    let off = false;
    getMyLounges().then((ls) => {
      if (off) return;
      setLoungeSlug(ls[0]?.slug ?? null);
      setLoungeDone(!!(ls[0]?.verified || ls[0]?.certified)); // hide Verify once verified or certified
    });
    return () => { off = true; };
  }, [isLounge, session?.uuid]);

  const TABS = isLounge ? LOUNGE_TABS : CONSUMER_TABS;

  // Brand-auth (separate cookie session) → render a dedicated portal nav so signed-in
  // brand users feel like they're inside their own login portal.
  const [brandPortal, setBrandPortal] = useState<{ name: string } | null>(null);
  useEffect(() => {
    let off = false;
    getMyBrands().then((bs) => { if (!off) setBrandPortal(bs[0] ? { name: bs[0].name } : null); }).catch(() => {});
    return () => { off = true; };
  }, [pathname]);

  if (brandPortal) {
    const link = (href: string, label: string, Icon: typeof LayoutDashboard) => {
      const active = pathname === href || pathname.startsWith(href + '/');
      return (
        <Link href={href} className={cn('flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition', active ? 'bg-ember-400/10 text-ember-100' : 'text-smoke-300 hover:text-paper')}>
          <Icon size={16} strokeWidth={1.5} /> {label}
        </Link>
      );
    };
    return (
      <header className="sticky top-0 z-40 border-b border-ember-400/10 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-6">
          <Link href="/brand" className="flex items-center gap-2">
            <img src="/logo.svg" alt="MyHumidor" className="h-7 w-auto" />
            <span className="hidden text-[10px] uppercase tracking-widest text-ember-400/80 sm:inline">Brand Portal</span>
          </Link>
          <div className="flex items-center gap-1">
            {link('/brand', 'Dashboard', LayoutDashboard)}
            {link('/brand/settings', 'Settings', Settings)}
            <button onClick={toggleTheme} className="ml-1 rounded-md p-2 text-smoke-400 hover:text-paper" aria-label="Toggle theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={async () => { await brandLogout(); location.href = '/brand/login'; }} className="ml-1 inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/20 px-3 py-1.5 text-xs text-smoke-300 hover:text-paper"><LogOut size={14} /> Sign out</button>
          </div>
        </div>
      </header>
    );
  }

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
              {isLounge && (
                <>
                  {!loungeDone && (
                    <Link href="/verify" className="btn-ghost text-xs" title="View certification plans">
                      <ShieldCheck size={14} strokeWidth={1.5} className="text-ember-400" />
                      <span className="hidden sm:inline">Plans</span>
                    </Link>
                  )}
                  <Link href="/dashboard" className="btn-ghost text-xs">
                    <LayoutDashboard size={14} strokeWidth={1.5} />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                </>
              )}
              <NotificationBell />
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/20 bg-char/60 py-1.5 pl-2 pr-2 hover:bg-ember-400/10"
                  title="Account"
                >
                  <User size={14} strokeWidth={1.5} className="text-ember-100 sm:hidden" />
                  <span className="hidden text-xs sm:inline">
                    <span className="text-paper">{session.displayName}</span>
                    <span className="ml-1.5 rounded bg-ember-400/15 px-1 py-0.5 text-[9px] uppercase tracking-wider text-ember-100">
                      {session.type === 'retailer' ? 'Retailer' : 'Member'}
                    </span>
                  </span>
                  <ChevronDown size={13} strokeWidth={1.5} className="text-smoke-400" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border-[0.5px] border-ember-400/20 bg-char shadow-xl">
                      {isLounge ? (
                        <>
                          <MenuItem href="/dashboard" icon={<LayoutDashboard size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                            Dashboard
                          </MenuItem>
                          {!loungeDone && (
                            <MenuItem href="/verify" icon={<ShieldCheck size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                              Plans
                            </MenuItem>
                          )}
                          <MenuItem href="/dashboard/plan" icon={<CreditCard size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                            My Plan
                          </MenuItem>
                          <MenuItem href="/submit" icon={<Cigarette size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                            Add a Cigar
                          </MenuItem>
                        </>
                      ) : (
                        <>
                          <MenuItem href="/profile" icon={<User size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                            My Profile
                          </MenuItem>
                          <MenuItem href="/check-in" icon={<Flame size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                            Check in
                          </MenuItem>
                          <MenuItem href="/submit" icon={<Cigarette size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                            Submit a Cigar
                          </MenuItem>
                        </>
                      )}
                      <MenuItem href="/account" icon={<Settings size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                        Account Settings
                      </MenuItem>
                      <MenuItem href="/account#notifications" icon={<Bell size={14} strokeWidth={1.5} />} onClick={() => setMenuOpen(false)}>
                        Notification Settings
                      </MenuItem>
                      <button
                        onClick={toggleTheme}
                        className="flex w-full items-center gap-2.5 border-t border-ember-400/10 px-4 py-2.5 text-left text-sm text-smoke-300 hover:bg-ember-400/10 hover:text-paper"
                      >
                        {dark ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />} {dark ? 'Light mode' : 'Dark mode'}
                      </button>
                      <button
                        onClick={async () => { setMenuOpen(false); await signOut(); window.location.href = '/'; }}
                        className="flex w-full items-center gap-2.5 border-t border-ember-400/10 px-4 py-2.5 text-left text-sm text-smoke-300 hover:bg-ember-400/10 hover:text-paper"
                      >
                        <LogOut size={14} strokeWidth={1.5} /> Sign out
                      </button>
                    </div>
                  </>
                )}
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

function MenuItem({
  href, icon, onClick, children,
}: {
  href: string; icon: React.ReactNode; onClick?: () => void; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-smoke-200 transition hover:bg-ember-400/10 hover:text-paper"
    >
      <span className="text-ember-100">{icon}</span>
      {children}
    </Link>
  );
}
