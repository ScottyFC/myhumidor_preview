'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Circle, Flame, Star, TrendingUp } from 'lucide-react';
import { topCigarsThisWeek, highestRatedCigars, type RatedCigar } from '@/lib/db';
import { BrandTile } from '@/components/BrandTile';
import { CigarThumb } from '@/components/CigarThumb';
import { CigarName } from '@/components/CigarName';

export function TopCigarsSections() {
  const [week, setWeek] = useState<RatedCigar[]>([]);
  const [best, setBest] = useState<RatedCigar[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let off = false;
    Promise.all([topCigarsThisWeek(8), highestRatedCigars(8)]).then(([w, b]) => {
      if (off) return;
      setWeek(w);
      setBest(b);
      setLoaded(true);
    });
    return () => {
      off = true;
    };
  }, []);

  if (!loaded || (week.length === 0 && best.length === 0)) return null;

  return (
    <div className="mb-12 space-y-10">
      {week.length > 0 && (
        <RankRow title="Top Cigars This Week" icon={<TrendingUp size={14} strokeWidth={1.5} className="text-ember-400" />} cigars={week} showCount />
      )}
      {best.length > 0 && (
        <RankRow title="Highest Rated" icon={<Circle size={14} strokeWidth={1.5} className="text-ember-400" />} cigars={best} />
      )}
    </div>
  );
}

function RankRow({
  title, icon, cigars, showCount,
}: {
  title: string; icon: React.ReactNode; cigars: RatedCigar[]; showCount?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="eyebrow">{title}</h2>
      </div>
      <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:thin]">
        {cigars.map((c, i) => (
          <Link key={c.slug} href={`/cigars/${c.slug}`} className="group w-44 shrink-0 snap-start">
            <div className="relative">
              <CigarThumb
                slug={c.slug}
                brand={c.brand}
                src={c.image_url}
                fit="contain"
                rounded="rounded-xl"
                className="aspect-[4/5] w-full text-3xl transition group-hover:ring-1 group-hover:ring-ember-400/40"
              />
              <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-char/90 font-display text-sm italic text-ember-400">
                {i + 1}
              </span>
            </div>
            <div className="mt-2 truncate text-sm font-medium group-hover:text-ember-100"><CigarName slug={c.slug} name={c.name} /></div>
            <div className="truncate text-xs text-smoke-400"><CigarName slug={c.slug} brand={c.brand} mode="brand" /> · {c.size}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-ember-100">
              <Circle size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
              <span className="tabular">{c.avgOverall.toFixed(1)}</span>
              {showCount && <span className="tabular text-smoke-400">· {c.ratingsCount} this week</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
