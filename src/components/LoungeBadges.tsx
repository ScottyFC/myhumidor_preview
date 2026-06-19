'use client';

import { useEffect, useState } from 'react';
import { Award, Upload, Loader2, Check, Sparkles } from 'lucide-react';
import { getMyLounges, type MyLounge } from '@/lib/lounges-owner';
import { listLoungeBadges, createLoungeBadge, uploadBadgeImage, type BadgeDef } from '@/lib/badges';

/** Premier-lounge owner tool: create collectible check-in badges. First free,
 *  additional cost extra. Upload a transparent PNG, or request team artwork. */
export function LoungeBadges() {
  const [lounge, setLounge] = useState<MyLounge | null>(null);
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [requestArt, setRequestArt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { getMyLounges().then((m) => setLounge(m.find((l) => l.certTier === 'premier') ?? null)); }, []);
  useEffect(() => { if (lounge) listLoungeBadges(lounge.loungeId).then(setBadges); }, [lounge]);

  if (!lounge) {
    return <p className="text-xs text-smoke-500">Collectible badges are a <span className="text-ember-200">Premier</span> feature. Upgrade your plan to reward members for checking in.</p>;
  }

  async function onImage(file?: File) {
    if (!file) return;
    setBusy(true); setErr('');
    const url = await uploadBadgeImage(file);
    setBusy(false);
    if (url) { setImage(url); setRequestArt(false); } else setErr('Upload failed — try a PNG under a few MB.');
  }

  async function create() {
    if (!name.trim()) return setErr('Give your badge a name.');
    if (!image && !requestArt) return setErr('Upload a PNG or request artwork from our team.');
    setBusy(true); setErr(''); setMsg('');
    const res = await createLoungeBadge({ loungeSlug: lounge!.slug, name: name.trim(), imageUrl: image, needsArtwork: requestArt });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? 'Could not create the badge.'); return; }
    setMsg(res.status === 'pending_artwork'
      ? 'Badge requested — our team will create the artwork and activate it.'
      : `Badge created${res.billable ? ' — this one is billable (see note below).' : ' — your first badge is on us!'}`);
    setName(''); setImage(null); setRequestArt(false);
    listLoungeBadges(lounge!.loungeId).then(setBadges);
  }

  return (
    <div className="max-w-xl">
      <div className="mb-2 flex items-center gap-2"><Award size={16} className="text-ember-400" /><h3 className="font-display text-lg">Collectible badges</h3></div>
      <p className="mb-4 text-xs text-smoke-400">
        Reward members with a collectible badge when they check in at {lounge.name}. Your <span className="text-ember-200">first badge is free</span>; additional badges cost extra.
      </p>

      {badges.length > 0 && (
        <ul className="mb-5 flex flex-wrap gap-3">
          {badges.map((b) => (
            <li key={b.id} className="flex w-28 flex-col items-center gap-1 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/60">
                {b.imageUrl
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={b.imageUrl} alt={b.name} className="h-12 w-12 object-contain" />
                  : <Award size={22} className="text-ember-400/60" />}
              </span>
              <span className="truncate text-xs text-smoke-200">{b.name}</span>
              {b.status === 'pending_artwork' && <span className="text-[10px] text-ember-300">artwork pending</span>}
              {b.billable && b.status !== 'pending_artwork' && <span className="text-[10px] text-smoke-500">add-on</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        <div>
          <label className="eyebrow mb-1 block">Badge name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Founders Lounge Regular"
            className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs text-ember-100 hover:bg-ember-400/10">
            <Upload size={13} /> {image ? 'Replace PNG' : 'Upload transparent PNG'}
            <input type="file" accept="image/png" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
          </label>
          {image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt="Badge preview" className="h-12 w-12 rounded-full bg-ink/60 object-contain p-1" />
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-smoke-300">
            <input type="checkbox" checked={requestArt} onChange={(e) => { setRequestArt(e.target.checked); if (e.target.checked) setImage(null); }} className="accent-ember-400" />
            <Sparkles size={12} className="text-ember-400" /> No artwork? Request our team to make one
          </label>
        </div>

        {err && <p className="text-xs text-red-400">{err}</p>}
        {msg && <p className="inline-flex items-center gap-1 text-xs text-ember-100"><Check size={12} strokeWidth={2} /> {msg}</p>}

        <button onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />} Create badge
        </button>
        <p className="text-[11px] text-smoke-500">Transparent PNG recommended (it sits on a dark medallion). Your first badge is free — additional badges are billed as add-ons.</p>
      </div>
    </div>
  );
}
