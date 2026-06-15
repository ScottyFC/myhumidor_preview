'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Check } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';

/**
 * Admin-only: upload artwork for a brand straight from a cigar's page. The
 * image is applied to this cigar and to every catalog cigar of the same brand
 * that doesn't already have one (via the admin-checked set_brand_image RPC).
 */
export function CigarImageUpload({ slug, brand }: { slug: string; brand: string }) {
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeAuth((s) => setAdmin(isAdmin(s?.publicId))), []);

  if (!admin || !isSupabaseConfigured) return null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setErr(''); setDone(0);
    try {
      const sb = supabaseBrowser();
      const path = `brand-art/${slug}-${Date.now()}.jpg`;
      const up = await sb.storage.from('avatars').upload(path, f, { contentType: f.type || 'image/jpeg', upsert: true });
      if (up.error) throw new Error(up.error.message);
      const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      const { data, error } = await sb.rpc('set_brand_image', { p_brand: brand, p_url: url, p_slug: slug });
      if (error) throw new Error(error.message);
      setDone(typeof data === 'number' ? data : 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border-[0.5px] border-dashed border-ember-400/30 bg-char/40 p-3">
      <div className="eyebrow mb-1.5">Admin · brand artwork</div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost text-xs">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} strokeWidth={1.5} />}
        Upload image for {brand}
      </button>
      {done > 0 && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ember-100">
          <Check size={11} strokeWidth={2} /> Applied to {done} cigar{done === 1 ? '' : 's'}. Refresh to see it.
        </p>
      )}
      {err && <p className="mt-1.5 text-[11px] text-red-400">{err}</p>}
    </div>
  );
}
