'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Gauge } from 'lucide-react';

interface Insight {
  description: string | null;
  recScore: { score: number; reasons: string[] } | null;
}

/** AI tasting description + a personalized recommendation score for the
 *  signed-in user, fetched together from /api/cigar-insight. */
export function CigarInsight({ slug }: { slug: string }) {
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cigar-insight?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return <div className="mt-6 h-20 animate-pulse rounded-xl border-[0.5px] border-ember-400/10 bg-char/30" />;
  }
  if (!data || (!data.description && !data.recScore)) return null;

  return (
    <div className="mt-6 space-y-4">
      {data.recScore && (
        <div className="flex items-center gap-3 rounded-xl border-[0.5px] border-ember-400/25 bg-ember-400/5 p-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(240,195,85,0.15)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f0c355" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(data.recScore.score / 100) * 97.4} 97.4`} />
            </svg>
            <span className="absolute text-sm font-semibold text-ember-100">{data.recScore.score}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-ember-100"><Gauge size={14} /> Recommended for you</div>
            <p className="text-xs text-smoke-400">
              {data.recScore.reasons.length ? data.recScore.reasons.join(' · ') : 'Based on your ratings and favorite flavors.'}
            </p>
          </div>
        </div>
      )}

      {data.description && (
        <div className="rounded-xl border-[0.5px] border-ember-400/12 bg-char/30 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-smoke-400"><Sparkles size={12} className="text-ember-400" /> AI tasting notes</div>
          <p className="text-sm leading-relaxed text-smoke-200">{data.description}</p>
        </div>
      )}
    </div>
  );
}
