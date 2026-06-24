'use client';
import { useEffect, useState } from 'react';
import { Loader2, Users, Star, MessageCircle, Download } from 'lucide-react';

interface Follower { handle: string; displayName: string; since: string }
interface Rating { cigar: string; overall: number | null; notes: string; when: string; handle: string }
interface Comment { cigar: string; body: string; when: string; handle: string }
interface Data { followerCount: number; followers: Follower[]; ratings: Rating[]; comments: Comment[] }

function csv(rows: string[][]) { return rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'); }
function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function AudiencePanel({ premium }: { premium: boolean }) {
  const [d, setD] = useState<Data | null | undefined>(undefined);
  useEffect(() => { let off = false; fetch('/api/brand/audience').then((r) => r.json()).then((j) => { if (!off) setD(j.ok ? j : null); }).catch(() => { if (!off) setD(null); }); return () => { off = true; }; }, []);

  function exportCsv() {
    if (!d) return;
    const rows: string[][] = [['Type', 'Handle', 'Cigar/Name', 'Detail', 'When']];
    d.followers.forEach((f) => rows.push(['follower', f.handle || f.displayName, '', '', f.since]));
    d.ratings.forEach((r) => rows.push(['rating', r.handle, r.cigar, `${r.overall ?? ''} ${r.notes}`.trim(), r.when]));
    d.comments.forEach((c) => rows.push(['comment', c.handle, c.cigar, c.body, c.when]));
    download('myhumidor-audience.csv', csv(rows));
  }

  return (
    <section id="audience" className="mt-8 scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Users size={18} className="text-ember-400" /> Audience</h2>
        {premium && d && <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs text-ember-100 hover:bg-ember-400/10"><Download size={13} /> Export CSV</button>}
      </div>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        {d === undefined ? <Loader2 className="animate-spin text-ember-400" /> : !d ? <p className="text-sm text-smoke-400">Couldn’t load your audience.</p> : (
          <>
            <div className="text-sm"><span className="font-display text-3xl text-ember-100">{d.followerCount}</span> <span className="text-smoke-400">follower{d.followerCount === 1 ? '' : 's'}</span></div>
            {!premium && <p className="mt-1 text-xs text-smoke-500">Upgrade to Premium to export your full follower & engagement list as CSV.</p>}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-smoke-500"><Star size={12} /> Recent ratings</div>
                {d.ratings.length === 0 ? <p className="text-sm text-smoke-500">No ratings yet.</p> : (
                  <div className="space-y-2">
                    {d.ratings.slice(0, 8).map((r, i) => (
                      <div key={i} className="text-sm"><span className="text-ember-200">{typeof r.overall === 'number' ? r.overall.toFixed(1) : '—'}★</span> <span className="text-paper">{r.cigar}</span> {r.handle && <span className="text-xs text-smoke-500">· @{r.handle}</span>}{r.notes && <div className="text-xs text-smoke-400">“{r.notes}”</div>}</div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-smoke-500"><MessageCircle size={12} /> Recent comments</div>
                {d.comments.length === 0 ? <p className="text-sm text-smoke-500">No comments yet.</p> : (
                  <div className="space-y-2">
                    {d.comments.slice(0, 8).map((c, i) => (
                      <div key={i} className="text-sm"><span className="text-paper">“{c.body}”</span> {c.handle && <span className="text-xs text-smoke-500">· @{c.handle}</span>}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
