'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Award, Plus, Trash2, Upload, ImageIcon, Download, Users } from 'lucide-react';
import { getBrandBadges, createBrandBadge, deleteBrandBadge, getBadgeHolders, uploadBrandImage, type BrandBadgeState } from '@/lib/brands';

export function BrandBadges({ brandName }: { brandName: string }) {
  const [state, setState] = useState<BrandBadgeState | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [tType, setTType] = useState<'rate_brand' | 'custom'>('rate_brand');
  const [count, setCount] = useState(3);
  const [trigger, setTrigger] = useState('');
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => setState((await getBrandBadges()) ?? null), []);
  useEffect(() => { load(); }, [load]);

  function pick(f?: File) { setErr(null); if (!f) { setFile(null); setPreview(null); return; } if (!f.type.startsWith('image/')) { setErr('Choose an image.'); return; } if (f.size > 8 * 1024 * 1024) { setErr('Under 8 MB please.'); return; } setFile(f); setPreview(URL.createObjectURL(f)); }

  async function create() {
    setErr(null);
    if (!title.trim()) return setErr('Add a title.');
    const criteria = tType === 'rate_brand'
      ? `Rate ${count} different cigars from ${brandName}`
      : trigger.trim();
    if (!criteria) return setErr('Describe how members earn it.');
    setBusy(true);
    let imageUrl: string | null = null;
    if (file) { const up = await uploadBrandImage('badge', file); if (up.error || !up.url) { setBusy(false); return setErr(up.error ?? 'Artwork upload failed.'); } imageUrl = up.url; }
    const r = await createBrandBadge({ title: title.trim(), trigger: criteria, imageUrl });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? 'Could not create badge.');
    setTitle(''); setTrigger(''); setCount(3); setTType('rate_brand'); setFile(null); setPreview(null); setAdding(false); load();
  }
  async function remove(id: string) { await deleteBrandBadge(id); load(); }
  async function exportHolders(id: string, title: string) {
    const res = await getBadgeHolders(id); if (!res) return;
    const rows = [['Handle', 'Name', 'Earned']].concat(res.holders.map((h) => [h.handle, h.displayName, h.earnedAt]));
    const csv = rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `badge-${title.replace(/\s+/g, '-').toLowerCase()}-holders.csv`; a.click();
  }

  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  const atLimit = state && !state.premium && state.usedThisQuarter >= 1;

  return (
    <section id="badges" className="mt-8 scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Award size={18} className="text-ember-400" /> Badges</h2>
        {state && !adding && (
          <button onClick={() => setAdding(true)} disabled={!!atLimit} title={atLimit ? 'Standard plans: one badge per quarter' : ''}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"><Plus size={13} /> New badge</button>
        )}
      </div>

      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        {state === undefined ? <Loader2 className="animate-spin text-ember-400" /> : !state ? <p className="text-sm text-smoke-400">Couldn’t load badges.</p> : (
          <>
            <div className="text-xs text-smoke-400">{state.premium ? 'Premium — unlimited badges, with downloadable holder lists.' : `Standard — ${state.usedThisQuarter}/1 badge this quarter.`}</div>

            {adding && (
              <div className="mt-3 space-y-2 rounded-lg border-[0.5px] border-ember-400/20 bg-char/40 p-3">
                <input className={input} placeholder="Badge title (e.g. Founders Club)" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wide text-smoke-500">Trigger — how members earn it</label>
                  <select className={input} value={tType} onChange={(e) => setTType(e.target.value as 'rate_brand' | 'custom')}>
                    <option value="rate_brand">Rate cigars from our brand (auto-awards)</option>
                    <option value="custom">Custom wording (advanced)</option>
                  </select>
                  {tType === 'rate_brand' ? (
                    <div className="flex items-center gap-2 text-sm text-smoke-200">
                      Rate
                      <select className={input + ' w-20'} value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))}>
                        {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      different {brandName} cigars
                    </div>
                  ) : (
                    <>
                      <textarea className={input + ' min-h-[70px]'} placeholder="e.g. Rate 3 different cigars from us" value={trigger} onChange={(e) => setTrigger(e.target.value)} />
                      <p className="text-xs text-amber-300/90">Custom triggers display to members but won’t grant automatically unless they match a known rule. The template above is recommended.</p>
                    </>
                  )}
                  {tType === 'rate_brand' && <p className="text-xs text-smoke-500">Members earn this by rating {count} different {brandName} {count === 1 ? 'cigar' : 'cigars'}. Awards automatically.</p>}
                </div>
                <div className="flex items-center gap-3">
                  {preview ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="" className="h-14 w-14 rounded-lg object-contain bg-char/60" /> : <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-char/60 text-smoke-500"><ImageIcon size={16} /></span>}
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs text-ember-100 hover:bg-ember-400/10"><Upload size={13} /> {file ? 'Change artwork' : 'Upload artwork'}<input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label>
                </div>
                {err && <p className="text-sm text-red-300">{err}</p>}
                <div className="flex gap-2">
                  <button onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create badge</button>
                  <button onClick={() => { setAdding(false); setErr(null); }} className="text-xs text-smoke-400 hover:text-paper">Cancel</button>
                </div>
              </div>
            )}

            <div className="mt-3 space-y-2">
              {state.badges.length === 0 && !adding && <p className="text-sm text-smoke-400">No badges yet. Create one members can earn.</p>}
              {state.badges.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/10 bg-char/40 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {b.imageUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain bg-char/60" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-char/60 text-smoke-600"><Award size={18} /></span>}
                    <div className="min-w-0">
                      <div className="font-medium text-paper">{b.title}</div>
                      <div className="truncate text-xs text-smoke-400">{b.trigger}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-smoke-500"><Users size={11} /> {b.holders} holder{b.holders === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.premium && <button onClick={() => exportHolders(b.id, b.title)} className="inline-flex items-center gap-1 rounded-md border-[0.5px] border-ember-400/20 px-2.5 py-1.5 text-xs text-ember-100 hover:bg-ember-400/10"><Download size={12} /> Holders</button>}
                    <button onClick={() => remove(b.id)} className="text-smoke-400 hover:text-red-300" aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
