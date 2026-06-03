'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import {
  recentCigars, recentMembers, recentLounges,
  type RecentCigar, type RecentMember, type RecentLounge,
} from '@/lib/db';
import { BrandTile } from '@/components/BrandTile';

export function RecentlyAdded({
  cigars = false,
  members = false,
  lounges = false,
}: {
  cigars?: boolean;
  members?: boolean;
  lounges?: boolean;
}) {
  const [c, setC] = useState<RecentCigar[]>([]);
  const [m, setM] = useState<RecentMember[]>([]);
  const [l, setL] = useState<RecentLounge[]>([]);

  useEffect(() => {
    let off = false;
    (async () => {
      const [cc, mm, ll] = await Promise.all([
        cigars ? recentCigars(8) : Promise.resolve([]),
        members ? recentMembers(8) : Promise.resolve([]),
        lounges ? recentLounges(8) : Promise.resolve([]),
      ]);
      if (off) return;
      setC(cc);
      setM(mm);
      setL(ll);
    })();
    return () => {
      off = true;
    };
  }, [cigars, members, lounges]);

  if (c.length === 0 && m.length === 0 && l.length === 0) return null;

  return (
    <div className="space-y-8">
      {c.length > 0 && (
        <Block title="Recently added cigars">
          {c.map((x) => (
            <Link key={x.uuid} href={`/cigars/${x.slug}`} className="group w-40 shrink-0 snap-start">
              <BrandTile
                name={x.brand}
                src={x.image_url}
                fit="contain"
                rounded="rounded-xl"
                className="aspect-[4/5] w-full text-3xl transition group-hover:ring-1 group-hover:ring-ember-400/40"
              />
              <div className="mt-2 truncate text-sm font-medium group-hover:text-ember-100">{x.name}</div>
              <div className="truncate text-xs text-smoke-400">{x.brand} · {x.size}</div>
            </Link>
          ))}
        </Block>
      )}

      {l.length > 0 && (
        <Block title="Recently added lounges">
          {l.map((x) => (
            <Link
              key={x.slug}
              href={`/lounges/${x.slug}`}
              className="group w-56 shrink-0 snap-start rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4 transition hover:border-ember-400/40"
            >
              <div className="flex items-center gap-3">
                <BrandTile name={x.name} src={x.image_url} className="h-11 w-11 shrink-0 text-base" rounded="rounded-lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-display text-sm font-medium group-hover:text-ember-100">{x.name}</span>
                    {x.certified && <BadgeCheck size={13} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
                  </div>
                  <div className="truncate text-xs text-smoke-400">{[x.city, x.state].filter(Boolean).join(', ')}</div>
                </div>
              </div>
            </Link>
          ))}
        </Block>
      )}

      {m.length > 0 && (
        <Block title="New members">
          {m.map((x) => (
            <Link key={x.handle} href={`/u/${x.handle}`} className="group w-40 shrink-0 snap-start text-center">
              {x.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={x.avatarUrl} alt={x.displayName} className="mx-auto h-16 w-16 rounded-full object-cover" />
              ) : (
                <BrandTile name={x.displayName} className="mx-auto h-16 w-16 text-xl" rounded="rounded-full" />
              )}
              <div className="mt-2 truncate text-sm font-medium group-hover:text-ember-100">{x.displayName}</div>
              <div className="truncate text-xs text-smoke-400">@{x.handle}</div>
            </Link>
          ))}
        </Block>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-3">{title}</div>
      <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:thin]">{children}</div>
    </div>
  );
}
