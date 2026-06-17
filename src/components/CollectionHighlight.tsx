import Link from 'next/link';
import { Cigarette, Box, Flame } from 'lucide-react';
import type { CollectionItem } from '@/lib/collection';
import { BrandLogo } from '@/components/BrandLogo';
import { CigarThumb } from '@/components/CigarThumb';

/**
 * Top-of-profile highlight: at a glance, what this member is keeping in their
 * humidor and what they've smoked, with thumbnail rows for each. Shown above
 * the rest of the profile so the cigar story leads.
 */
export function CollectionHighlight({
  humidor, smoked, self,
}: { humidor: CollectionItem[]; smoked: CollectionItem[]; self?: boolean }) {
  if (humidor.length === 0 && smoked.length === 0) return null;

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <Panel
        icon={<Box size={13} strokeWidth={1.5} className="text-ember-400" />}
        label={self ? 'In your humidor' : 'In the humidor'}
        count={humidor.length}
        items={humidor}
        empty={self ? 'Nothing saved yet.' : 'No cigars saved.'}
        href={self ? '/humidor' : undefined}
      />
      <Panel
        icon={<Flame size={13} strokeWidth={1.5} className="text-ember-400" />}
        label="Smoked"
        count={smoked.length}
        items={smoked}
        empty={self ? 'Rate a cigar to log your first smoke.' : 'No smokes logged yet.'}
      />
    </div>
  );
}

function Panel({
  icon, label, count, items, empty, href,
}: { icon: React.ReactNode; label: string; count: number; items: CollectionItem[]; empty: string; href?: string }) {
  return (
    <section className="rounded-2xl border-[0.5px] border-ember-400/15 bg-gradient-to-b from-char/70 to-char/30 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="eyebrow flex items-center gap-1.5">{icon}{label}</h2>
        <div className="flex items-baseline gap-3">
          {href && (
            <Link href={href} className="text-[11px] uppercase tracking-wider text-ember-200/80 hover:text-ember-100">
              View →
            </Link>
          )}
          <span className="font-display text-2xl tabular text-ember-100">{count}</span>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-smoke-500">{empty}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-0.5 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.slice(0, 12).map((c) => (
            <Link key={c.cigarId} href={`/cigars/${c.slug}`} className="group w-20 shrink-0" title={`${c.brand} ${c.name}`}>
              <CigarThumb slug={c.slug} brand={c.brand} fit="contain" rounded="rounded-lg"
                className="aspect-[4/5] w-full text-base transition group-hover:ring-1 group-hover:ring-ember-400/50" />
              <div className="mt-1.5 truncate text-[10px] text-smoke-400 group-hover:text-ember-100">{c.name}</div>
            </Link>
          ))}
          {items.length > 12 && (
            <div className="flex w-20 shrink-0 items-center justify-center text-xs text-smoke-400">
              +{items.length - 12}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
