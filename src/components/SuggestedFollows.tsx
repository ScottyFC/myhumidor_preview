'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { fetchSuggestedFollows, type FollowPerson } from '@/lib/follows';
import { FollowButton } from '@/components/FollowButton';

function Initials({ name }: { name: string }) {
  const i = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ember-600/30 text-sm font-medium text-ember-100 ring-1 ring-ember-400/30">
      {i}
    </div>
  );
}

export function SuggestedFollows({ selfId, state }: { selfId: string; state?: string }) {
  const [people, setPeople] = useState<FollowPerson[] | null>(null);

  useEffect(() => {
    let off = false;
    fetchSuggestedFollows(selfId, { state, limit: 8 }).then((p) => !off && setPeople(p));
    return () => { off = true; };
  }, [selfId, state]);

  if (people === null || people.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus size={16} strokeWidth={1.5} className="text-ember-400" />
        <h2 className="font-display text-2xl tracking-tightest">Suggested for you</h2>
      </div>
      <p className="mb-4 text-xs text-smoke-400">New members{state ? ` in ${state} and` : ''} across the community. Only you can see these.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {people.map((p) => (
          <div key={p.handle} className="flex items-center gap-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-3">
            <Link href={`/u/${p.handle}`} className="shrink-0">
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarUrl} alt={p.displayName} className="h-11 w-11 rounded-full object-cover ring-1 ring-ember-400/30" />
              ) : (
                <Initials name={p.displayName} />
              )}
            </Link>
            <Link href={`/u/${p.handle}`} className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-paper">{p.displayName}</div>
              <div className="truncate text-xs text-smoke-400">@{p.handle}</div>
            </Link>
            <FollowButton handle={p.handle} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
