'use client';
import { useRef } from 'react';
import { Play, ChevronLeft, ChevronRight, Tv } from 'lucide-react';
import type { FeaturedEpisode } from '@/lib/featured-episodes';

export function FeaturedEpisodes({ items }: { items: FeaturedEpisode[] }) {
  const scroller = useRef<HTMLDivElement | null>(null);
  if (!items.length) return null;
  const by = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <section className="mt-12 hidden md:block">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Tv size={18} strokeWidth={1.5} className="text-ember-400" /> Featured on</h2>
        {items.length > 2 && (
          <div className="hidden gap-1.5 sm:flex">
            <button onClick={() => by(-360)} aria-label="Scroll left" className="flex h-8 w-8 items-center justify-center rounded-full border-[0.5px] border-ember-400/20 text-smoke-300 transition hover:border-ember-400/50 hover:text-ember-100"><ChevronLeft size={16} /></button>
            <button onClick={() => by(360)} aria-label="Scroll right" className="flex h-8 w-8 items-center justify-center rounded-full border-[0.5px] border-ember-400/20 text-smoke-300 transition hover:border-ember-400/50 hover:text-ember-100"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
      <div ref={scroller} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((e, i) => (
          <a
            key={e.url || i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative w-[280px] shrink-0 snap-start overflow-hidden rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 transition hover:border-ember-400/40"
          >
            <div className="relative aspect-video overflow-hidden bg-char/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.thumbnail} alt={e.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ember-400/90 text-ink shadow-lg"><Play size={20} className="ml-0.5 fill-ink" /></span>
              </div>
              {typeof e.score === 'number' && (
                <span className="absolute right-2 top-2 rounded-full bg-ember-400 px-2 py-0.5 font-display text-xs font-medium tabular text-ink">{e.score.toFixed(1)}</span>
              )}
            </div>
            <div className="p-3">
              <div className="eyebrow truncate text-ember-300">{e.series}</div>
              <div className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-paper">{e.title}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
