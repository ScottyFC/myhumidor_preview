'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Box, Search, MapPin, User, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/humidor', label: 'Humidor', icon: Box },
  { href: '/top', label: 'Top Cigars', icon: Flame },
  { href: '/map', label: 'Map', icon: MapPin },
  { href: '/lounges', label: 'Lounges', icon: Search },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-ember-400/15 bg-char/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <Image
            src="/myhumidor-wordmark.png"
            alt="MyHumidor"
            width={3049}
            height={850}
            priority
            className="h-7 w-auto rounded-[3px]"
          />
          <span className="hidden text-[10px] uppercase tracking-widest text-smoke-400 sm:inline">
            by CigarTV
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
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

        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs">
            <User size={14} strokeWidth={1.5} />
            <span className="hidden sm:inline">Sign in</span>
          </button>
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
                href={tab.href}
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
