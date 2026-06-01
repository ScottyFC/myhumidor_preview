'use client';

import Link from 'next/link';
import { Star, BadgeCheck, Megaphone, Box, Heart, Sparkles, CalendarDays } from 'lucide-react';
import { getFeed, type FeedPost } from '@/lib/mock-data';
import { BrandTile } from '@/components/BrandTile';
import { FollowButton } from '@/components/FollowButton';

export function Feed() {
  const posts = getFeed();
  return (
    <div className="space-y-3">
      <p className="text-xs text-smoke-400">
        Activity from people you follow and lounges near you. Promoted lounge posts are labeled.
      </p>
      {posts.map((p) => (p.isLounge ? <LoungePost key={p.id} p={p} /> : <UserPost key={p.id} p={p} />))}
    </div>
  );
}

function UserPost({ p }: { p: FeedPost }) {
  const verb =
    p.kind === 'rated' ? 'rated' : p.kind === 'wishlisted' ? 'added to wishlist' : 'added to humidor';
  const Icon = p.kind === 'rated' ? Star : p.kind === 'wishlisted' ? Heart : Box;
  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
      <div className="flex items-start gap-3">
        <BrandTile name={p.authorName} className="h-10 w-10 shrink-0 text-base" rounded="rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 text-sm">
              <Link href={`/u/${p.authorHandle}`} className="font-medium hover:text-ember-100">
                {p.authorName}
              </Link>
              <span className="text-smoke-400"> @{p.authorHandle} · {p.when}</span>
            </div>
            <FollowButton handle={p.authorHandle} size="sm" />
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-smoke-300">
            <Icon size={12} strokeWidth={1.5} className="text-ember-400" />
            {verb}
            {p.kind === 'rated' && p.rating != null && (
              <span className="inline-flex items-center gap-0.5 text-ember-100">
                · <Star size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                {p.rating.toFixed(1)}
              </span>
            )}
          </div>
          {p.cigar && (
            <Link
              href={`/cigars/${p.cigar.slug}`}
              className="mt-2 flex items-center gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/60 p-2.5 transition hover:border-ember-400/40"
            >
              <BrandTile name={p.cigar.brand} className="h-9 w-7 shrink-0 text-[10px]" rounded="rounded" />
              <div className="min-w-0">
                <div className="eyebrow truncate">{p.cigar.brand}</div>
                <div className="truncate text-sm font-medium">{p.cigar.line}</div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function LoungePost({ p }: { p: FeedPost }) {
  const KindIcon = p.kind === 'event' ? CalendarDays : p.kind === 'new_arrival' ? Sparkles : Megaphone;
  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-4">
      <div className="flex items-start gap-3">
        <BrandTile name={p.authorName} className="h-10 w-10 shrink-0 text-base" rounded="rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-sm">
              <Link href={`/lounges/${p.loungeSlug}`} className="truncate font-medium hover:text-ember-100">
                {p.authorName}
              </Link>
              {p.authorVerified && <BadgeCheck size={14} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
              <span className="shrink-0 text-smoke-400">· {p.when}</span>
            </div>
            {p.promoted && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ember-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ember-100">
                <Megaphone size={10} strokeWidth={1.5} /> Promoted
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <KindIcon size={14} strokeWidth={1.5} className="text-ember-400" />
            <span className="font-display text-base">{p.title}</span>
          </div>
          {p.body && <p className="mt-1 text-sm text-smoke-200">{p.body}</p>}
          {p.cigar && (
            <Link
              href={`/cigars/${p.cigar.slug}`}
              className="mt-2 inline-flex items-center gap-2 rounded-full border-[0.5px] border-ember-400/20 px-3 py-1 text-xs text-smoke-200 hover:border-ember-400/40"
            >
              {p.cigar.brand} {p.cigar.line} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
