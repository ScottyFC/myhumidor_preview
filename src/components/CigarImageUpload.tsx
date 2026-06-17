'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Check, Sparkles, Link2, Upload } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Source = 'upload' | 'url';
type Scope = 'cigar' | 'brand';

/**
 * Admin-only image control on a cigar page. Admins can set or OVERWRITE the
 * cigar/label photo either by direct file upload or by pasting an image URL,
 * and choose whether it applies to just this cigar (set_cigar_image) or the
 * whole brand (set_brand_image). Also offers a one-click logo.dev autofill.
 */
export function CigarImageUpload({ slug, brand }: { slug: string; brand: string }) {
  const [admin, setAdmin] = useState(false);
  const [source, setSource] = useState<Source>('upload');
  const [scope, setScope] = useState<Scope>('cigar');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeAuth((s) => setAdmin(isAdmin(s?.publicId))), []);

  if (!admin || !isSupabaseConfigured) return null;

  // Apply a resolved image URL to this cigar or the whole brand.
  async function apply(imageUrl: string) {
    const sb = supabaseBrowser();
    if (scope === 'cigar') {
      const { data, error } = await sb.rpc('set_cigar_image', { p_slug: slug, p_url: imageUrl });
      if (error) throw new Error(error.message);
      return typeof data === 'number' ? data : 1;
    }
    const { data, error } = await sb.rpc('set_brand_image', { p_brand: brand, p_url: imageUrl, p_slug: slug });
    if (error) throw new Error(error.message);
    return typeof data === 'number' ? data : 1;
  }

  async function uploadFile(f: File): Promise<string> {
    const sb = supabaseBrowser();
    const path = `cigar-art/${slug}-${Date.now()}.jpg`;
    const up = await sb.storage.from('avatars').upload(path, f, { contentType: f.type || 'image/jpeg', upsert: true });
    if (up.error) throw new Error(up.error.message);
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }

  async function run(getUrl: () => Promise<string>) {
    setBusy(true); setErr(''); setDone(null);
    try {
      const imageUrl = await getUrl();
      const n = await apply(imageUrl);
      setDone(n);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) run(() => uploadFile(f));
  }

  function submitUrl() {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) { setErr('Enter a valid image URL (http/https).'); return; }
    run(async () => u);
  }

  const seg = (active: boolean) =>
    cn('rounded-md px-2.5 py-1 text-[11px] font-medium transition',
      active ? 'bg-ember-400/15 text-ember-100' : 'text-smoke-300 hover:text-ember-100');

  return (
    <div className="mt-3 rounded-lg border-[0.5px] border-dashed border-ember-400/30 bg-char/40 p-3">
      <div className="eyebrow mb-2">Admin · cigar / label image</div>

      {/* source + scope toggles */}
      <div className="mb-2.5 flex flex-wrap items-center gap-3 text-[11px]">
        <div className="inline-flex rounded-md border-[0.5px] border-ember-400/20 p-0.5">
          <button onClick={() => setSource('upload')} className={seg(source === 'upload')}>Upload file</button>
          <button onClick={() => setSource('url')} className={seg(source === 'url')}>Image URL</button>
        </div>
        <div className="inline-flex rounded-md border-[0.5px] border-ember-400/20 p-0.5">
          <button onClick={() => setScope('cigar')} className={seg(scope === 'cigar')}>This cigar</button>
          <button onClick={() => setScope('brand')} className={seg(scope === 'brand')}>Whole brand</button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />

      {source === 'upload' ? (
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost text-xs">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} strokeWidth={1.5} />}
          {scope === 'cigar' ? 'Upload / overwrite this cigar’s image' : `Upload image for ${brand}`}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/cigar.jpg"
            className="min-w-[220px] flex-1 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-1.5 text-xs text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
          />
          <button onClick={submitUrl} disabled={busy} className="btn-ghost text-xs">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} strokeWidth={1.5} />}
            Set from URL
          </button>
        </div>
      )}

      <div className="mt-2">
        <button onClick={() => run(async () => {
          const res = await fetch(`/api/brand-logo?brand=${encodeURIComponent(brand)}`);
          const d = await res.json();
          if (!d.url) throw new Error('No logo found for this brand on logo.dev.');
          return d.url as string;
        })} disabled={busy} className="btn-ghost text-[11px] text-smoke-300">
          <Sparkles size={12} strokeWidth={1.5} /> Autofill from logo.dev
        </button>
      </div>

      {done !== null && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-ember-100">
          <Check size={11} strokeWidth={2} /> Updated {done} cigar{done === 1 ? '' : 's'}. Refresh to see it.
        </p>
      )}
      {err && <p className="mt-2 text-[11px] text-red-400">{err}</p>}
      <p className="mt-1.5 text-[10px] text-smoke-500">
        “This cigar” overwrites just this entry’s photo; “Whole brand” fills every same-brand cigar (and this one).
      </p>
    </div>
  );
}
