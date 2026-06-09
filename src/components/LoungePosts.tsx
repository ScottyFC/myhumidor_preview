'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Sparkles, CalendarDays, Store } from 'lucide-react';
import { getPostsForSlug, KIND_LABEL, type LoungePost } from '@/lib/lounge-posts';

const ICON = { deal: Megaphone, new_arrival: Sparkles, event: CalendarDays, update: Store } as const;

export function LoungePosts({ slug }: { slug: string }) {
  const [posts, setPosts] = useState<LoungePost[] | null>(null);

  useEffect(() => {
    let off = false;
    getPostsForSlug(slug).then((p) => !off && setPosts(p));
    return () => {
      off = true;
    };
  }, [slug]);

  if (posts === null || posts.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="eyebrow mb-3">Latest from this lounge</h2>
      <div className="space-y-3">
        {posts.map((p) => {
          const Icon = ICON[p.kind];
          return (
            <div key={p.id} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
              <div className="flex items-center gap-2">
                <Icon size={14} strokeWidth={1.5} className="text-ember-400" />
                <span className="eyebrow">{KIND_LABEL[p.kind]}</span>
                {p.promoted && (
                  <span className="rounded-full bg-ember-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ember-100">
                    Promoted
                  </span>
                )}
                {p.eventAt && (
                  <span className="text-xs text-smoke-400">{new Date(p.eventAt).toLocaleDateString()}</span>
                )}
              </div>
              <div className="mt-1 font-display text-lg">{p.title}</div>
              {p.body && <p className="mt-1 text-sm text-smoke-200">{p.body}</p>}
              {p.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt={p.title} className="mt-3 max-h-72 w-full rounded-lg object-cover" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
