'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { getLoungeFollowers, type LoungeFollower } from '@/lib/lounge-follows';

function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '•';
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
}

/** Lets a lounge owner see who follows them. */
export function LoungeFollowers({ loungeId }: { loungeId: string }) {
  const [followers, setFollowers] = useState<LoungeFollower[] | null>(null);

  useEffect(() => {
    let on = true;
    getLoungeFollowers(loungeId).then((f) => { if (on) setFollowers(f); });
    return () => { on = false; };
  }, [loungeId]);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-ember-400" />
        <h2 className="font-display text-xl tracking-tightest">Followers</h2>
        {followers && <span className="text-sm text-smoke-400">{followers.length}</span>}
      </div>

      {followers === null ? (
        <p className="text-sm text-smoke-400">Loading…</p>
      ) : followers.length === 0 ? (
        <p className="text-sm text-smoke-400">No followers yet. Share your lounge page to grow your audience.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {followers.map((f) => (
            <Link
              key={f.id}
              href={`/u/${f.handle}`}
              className="flex items-center gap-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-2.5 transition hover:border-ember-400/30"
            >
              {f.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.avatarUrl} alt={f.displayName} className="h-9 w-9 shrink-0 rounded-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember-400/15 text-xs font-medium text-ember-200">{initials(f.displayName)}</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-paper">{f.displayName}</span>
                <span className="block truncate text-xs text-smoke-400">@{f.handle}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
