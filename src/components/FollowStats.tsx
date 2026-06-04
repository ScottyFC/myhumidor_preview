'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchFollowStats, fetchFollowList, onFollowingChange, type FollowPerson } from '@/lib/follows';

function Initials({ name }: { name: string }) {
  const i = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ember-600/30 text-xs font-medium text-ember-100 ring-1 ring-ember-400/30">
      {i}
    </div>
  );
}

export function FollowStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [open, setOpen] = useState<null | 'followers' | 'following'>(null);
  const [list, setList] = useState<FollowPerson[] | null>(null);

  useEffect(() => {
    let off = false;
    const load = () => fetchFollowStats(userId).then((s) => !off && setStats(s));
    load();
    // refresh when the signed-in user follows/unfollows someone
    const unsub = onFollowingChange(load);
    return () => { off = true; unsub(); };
  }, [userId]);

  function toggle(kind: 'followers' | 'following') {
    if (open === kind) { setOpen(null); return; }
    setOpen(kind);
    setList(null);
    fetchFollowList(userId, kind).then(setList);
  }

  return (
    <div className="mt-4">
      <div className="flex gap-5 text-sm">
        <button onClick={() => toggle('following')} className="transition hover:text-ember-100">
          <span className="tabular font-medium text-paper">{stats.following}</span>{' '}
          <span className="text-smoke-400">Following</span>
        </button>
        <button onClick={() => toggle('followers')} className="transition hover:text-ember-100">
          <span className="tabular font-medium text-paper">{stats.followers}</span>{' '}
          <span className="text-smoke-400">Followers</span>
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-3">
          {list === null ? (
            <div className="py-3 text-center text-xs text-smoke-400">Loading…</div>
          ) : list.length === 0 ? (
            <div className="py-3 text-center text-xs text-smoke-400">
              {open === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {list.map((p) => (
                <Link
                  key={p.handle}
                  href={`/u/${p.handle}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-ember-400/10"
                >
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt={p.displayName} className="h-9 w-9 rounded-full object-cover ring-1 ring-ember-400/30" />
                  ) : (
                    <Initials name={p.displayName} />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-paper">{p.displayName}</div>
                    <div className="truncate text-xs text-smoke-400">@{p.handle}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
