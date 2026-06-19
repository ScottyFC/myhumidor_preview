'use client';

import { useEffect, useState } from 'react';
import { Award, Upload, Loader2, Check } from 'lucide-react';
import { listPendingBadgeArtwork, uploadBadgeImage, setBadgeArtwork, type BadgeDef } from '@/lib/badges';

/** Super-admin: badges that lounge owners requested artwork for. Upload a PNG to
 *  create + activate the badge. */
export function BadgeArtworkQueue() {
  const [items, setItems] = useState<Array<BadgeDef & { loungeName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); listPendingBadgeArtwork().then((r) => { setItems(r); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  async function attach(badgeId: string, file?: File) {
    if (!file) return;
    setBusy(badgeId); setMsg('');
    const url = await uploadBadgeImage(file);
    if (url) {
      const ok = await setBadgeArtwork(badgeId, url);
      if (ok) { setMsg('Artwork attached — badge activated.'); load(); }
      else setMsg('Could not save artwork.');
    } else setMsg('Upload failed.');
    setBusy(null);
  }

  if (loading) return <div className="text-smoke-400"><Loader2 className="animate-spin text-ember-400" /></div>;

  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm text-smoke-300">Lounges that requested badge artwork. Upload a transparent PNG to create and activate each badge.</p>
      {msg && <p className="mb-3 rounded-lg border-[0.5px] border-ember-400/25 bg-ember-400/10 px-3 py-2 text-sm text-ember-100">{msg}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-smoke-400">No pending artwork requests.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
              <span className="flex items-center gap-3">
                <Award size={18} className="text-ember-400" />
                <span><span className="block text-sm font-medium text-paper">{b.name}</span>{b.loungeName && <span className="text-xs text-smoke-400">{b.loungeName}</span>}</span>
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-ember-400 px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-ember-600">
                {busy === b.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload PNG
                <input type="file" accept="image/png" className="hidden" onChange={(e) => attach(b.id, e.target.files?.[0])} />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
