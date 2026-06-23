'use client';

import Link from 'next/link';
import { CigarName } from '@/components/CigarName';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Flame, Heart, Store, MapPin, Plus, Sparkles, Box, X, ArrowRight } from 'lucide-react';
import { CigarThumb } from '@/components/CigarThumb';
import { BurnRateCarousel } from '@/components/BurnRateCarousel';
import { HomeWelcome } from '@/components/HomeWelcome';

interface Feat { slug: string; brand: string; name: string; image_url?: string | null }

const TILES: { label: string; href: string; icon: typeof Flame; tint: string }[] = [
  { label: 'Top Rated', href: '/top', icon: Flame, tint: 'text-ember-400' },
  { label: 'For You', href: '/top', icon: Heart, tint: 'text-ember-400' },
  { label: 'Lounges', href: '/lounges', icon: Store, tint: 'text-ember-400' },
  { label: 'Add Cigar', href: '/submit', icon: Plus, tint: 'text-ember-400' },
  { label: 'Concierge', href: '/top', icon: Sparkles, tint: 'text-ember-400' },
  { label: 'My Humidor', href: '/humidor', icon: Box, tint: 'text-ember-400' },
];

const CHIPS: { label: string; href: string }[] = [
  { label: 'Top Rated', href: '/top' },
  { label: 'New arrivals', href: '/search?q=' },
  { label: 'Nicaragua', href: '/search?q=Nicaragua' },
  { label: 'Maduro', href: '/search?q=Maduro' },
  { label: 'Connecticut', href: '/search?q=Connecticut' },
  { label: 'Robusto', href: '/search?q=Robusto' },
];

/**
 * Native-app home screen: a tile-grid launcher, search, a promo banner and a
 * "Trending now" rail — an app-style layout (not the marketing site), shown
 * only inside the Capacitor shell. The web home is unchanged.
 */
export function NativeHome({ featured }: { featured: Feat[] }) {
  const router = useRouter();
  const [promo, setPromo] = useState(true);

  return (
    <div className="native-only-block px-4 pt-2">
      <HomeWelcome />
      {/* Search */}
      <button
        onClick={() => router.push('/search')}
        className="flex w-full items-center gap-2.5 rounded-2xl border-[0.5px] border-ember-400/20 bg-char/70 px-4 py-3 text-left text-sm text-smoke-400 active:bg-char"
      >
        <Search size={17} strokeWidth={1.5} className="text-ember-400" />
        Search cigars, brands, lounges…
      </button>

      {/* Quick-action tiles (2 × 4) */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={t.href}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-[0.5px] border-ember-400/12 bg-gradient-to-b from-char/80 to-char/40 py-3.5 active:from-ember-400/10"
            >
              <Icon size={22} strokeWidth={1.75} className={t.tint} />
              <span className="text-center text-[10.5px] font-medium leading-tight text-smoke-200">{t.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Promo banner */}
      {promo && (
        <div className="relative mt-4 overflow-hidden rounded-2xl border-[0.5px] border-ember-400/25">
          <div className="absolute inset-0 bg-gradient-to-r from-leather-deep via-ember-600/40 to-leather-deep" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_-10%,rgba(240,195,85,0.30),transparent_55%)]" />
          <button
            onClick={() => setPromo(false)}
            aria-label="Dismiss"
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-char/40 text-ember-50/80"
          >
            <X size={15} />
          </button>
          <Link href="/submit" className="relative block px-5 py-5">
            <div className="font-display text-xl leading-tight text-ember-50">
              Track every cigar you smoke
            </div>
            <p className="mt-1 max-w-[80%] text-xs text-ember-100/80">
              Rate it, log the lounge, build your humidor — add one in seconds.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ember-400 px-3.5 py-1.5 text-xs font-semibold text-paper">
              Add a cigar <ArrowRight size={13} strokeWidth={2} />
            </span>
          </Link>
        </div>
      )}

      <BurnRateCarousel />

      {/* Trending now */}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="font-display text-2xl tracking-tightest">Trending now</h2>
        <Link href="/top" className="text-[11px] uppercase tracking-wider text-ember-200/80">View all</Link>
      </div>

      {/* Quick filter chips */}
      <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHIPS.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="shrink-0 rounded-full border-[0.5px] border-ember-400/25 bg-char/60 px-3.5 py-1.5 text-xs font-medium text-smoke-200 active:bg-ember-400/10"
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* Featured cigar rail */}
      <div className="mt-3 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {featured.map((c) => (
          <Link key={c.slug} href={`/cigars/${c.slug}`} className="w-32 shrink-0">
            <CigarThumb slug={c.slug} brand={c.brand} src={c.image_url} fit="contain" rounded="rounded-xl" className="aspect-[4/5] w-full text-2xl" />
            <div className="mt-1.5 truncate text-[11px] font-medium text-paper"><CigarName slug={c.slug} name={c.name} /></div>
            <div className="truncate text-[10px] text-smoke-400">{c.brand}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
