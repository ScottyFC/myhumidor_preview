'use client';

import { useState } from 'react';
import { Loader2, Upload, Check, ImageIcon, Store } from 'lucide-react';
import { updateBrandDetails, uploadBrandImage, type BrandDetail } from '@/lib/brands';

export function BrandDetailsEditor({ brandId, detail, onSaved }: { brandId: string; detail: BrandDetail; onSaved: () => void }) {
  const [logoUrl, setLogoUrl] = useState(detail.logoUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(detail.bannerUrl ?? '');
  const [description, setDescription] = useState(detail.description ?? '');
  const [website, setWebsite] = useState(detail.website ?? '');
  const [hq, setHq] = useState(detail.hq ?? '');
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState<'logo' | 'banner' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function upload(kind: 'logo' | 'banner', file?: File) {
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith('image/')) { setErr('Please choose an image.'); return; }
    if (file.size > 6 * 1024 * 1024) { setErr('Image must be under 6 MB.'); return; }
    setUp(kind);
    const { url, error } = await uploadBrandImage(kind, file);
    setUp(null);
    if (error || !url) { setErr(error ?? 'Upload failed.'); return; }
    if (kind === 'logo') setLogoUrl(url); else setBannerUrl(url);
    // persist immediately so onboarding reflects it
    await updateBrandDetails(brandId, kind === 'logo' ? { logoUrl: url } : { bannerUrl: url });
    onSaved();
  }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    const res = await updateBrandDetails(brandId, { logoUrl: logoUrl || null, bannerUrl: bannerUrl || null, description: description || null, website: website || null, hq: hq || null });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? 'Save failed.'); return; }
    setMsg('Published ✓'); onSaved();
  }

  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm focus:border-ember-400/50 focus:outline-none';
  const upBtn = 'inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs text-ember-100 hover:bg-ember-400/10';

  return (
    <section id="brand-details" className="mt-8 scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Store size={18} className="text-ember-400" /> Brand page</h2>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-smoke-400">Logo</div>
            <div className="flex items-center gap-3">
              {logoUrl
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-char/60 text-smoke-500"><ImageIcon size={16} /></span>}
              <label className={upBtn}>
                {up === 'logo' ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Upload size={13} /> {logoUrl ? 'Replace' : 'Upload'}</>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => upload('logo', e.target.files?.[0])} />
              </label>
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-smoke-400">Banner</div>
            <div className="flex items-center gap-3">
              {bannerUrl
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={bannerUrl} alt="" className="h-12 w-20 rounded-lg object-cover" />
                : <span className="flex h-12 w-20 items-center justify-center rounded-lg bg-char/60 text-smoke-500"><ImageIcon size={16} /></span>}
              <label className={upBtn}>
                {up === 'banner' ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Upload size={13} /> {bannerUrl ? 'Replace' : 'Upload'}</>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => upload('banner', e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </div>
        <textarea className={input + ' mt-4'} rows={3} placeholder="Brand bio — tell collectors who you are" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <input className={input} placeholder="Headquarters (e.g. Estelí, Nicaragua)" value={hq} onChange={(e) => setHq(e.target.value)} />
        </div>
        {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
        <div className="mt-3 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Publish
          </button>
          {msg && <span className="text-xs text-ember-200">{msg}</span>}
        </div>
      </div>
    </section>
  );
}
