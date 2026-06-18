'use client';

import { useState } from 'react';
import { Loader2, Check, BadgeCheck, BadgeX, UserPlus } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase';

/** Admin tool: search a lounge by slug, toggle certification, assign an owner. */
export function LoungeCertControl() {
  const [slug, setSlug] = useState('');
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function setCert(on: boolean) {
    const s = slug.trim();
    if (!s) { setErr('Enter a lounge slug.'); return; }
    setBusy('cert'); setErr(''); setMsg('');
    try {
      const { error } = await supabaseBrowser().rpc('admin_set_certification', { p_slug: s, p_on: on });
      if (error) throw new Error(error.message);
      setMsg(on ? `Certified ${s}.` : `Removed certification from ${s}.`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setBusy(null); }
  }

  async function assignOwner() {
    const s = slug.trim(); const h = handle.trim().replace(/^@/, '');
    if (!s || !h) { setErr('Enter both a lounge slug and a member handle.'); return; }
    setBusy('owner'); setErr(''); setMsg('');
    try {
      const { data, error } = await supabaseBrowser().rpc('admin_set_lounge_owner', { p_slug: s, p_handle: h });
      if (error) throw new Error(error.message);
      setMsg(`Assigned ${data ?? h} as owner of ${s} (now a retailer).`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setBusy(null); }
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-smoke-300">Manage a lounge’s certification and ownership. Use the lounge’s slug (from its URL, e.g. <code className="text-ember-200">deadwood-tobacco-co</code>).</p>

      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="lounge-slug"
        className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCert(true)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs font-semibold text-ember-100 hover:bg-ember-400/10 disabled:opacity-50">
          {busy === 'cert' ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />} Certify
        </button>
        <button onClick={() => setCert(false)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
          {busy === 'cert' ? <Loader2 size={13} className="animate-spin" /> : <BadgeX size={13} />} Remove certification
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-ember-400/10 pt-4">
        <div className="flex-1">
          <label className="eyebrow mb-1 block">Assign owner (member handle)</label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle"
            className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
          />
        </div>
        <button onClick={assignOwner} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">
          {busy === 'owner' ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Assign owner
        </button>
      </div>

      {msg && <p className="inline-flex items-center gap-1 text-xs text-ember-100"><Check size={12} strokeWidth={2} /> {msg}</p>}
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}
