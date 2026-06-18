'use client';

import { useState } from 'react';
import { BadgeCheck, BadgeX, UserPlus, Loader2, Check } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase';

/** Admin: toggle a lounge's certification and assign an owner by member handle. */
export function LoungeOwnerControls() {
  const [slug, setSlug] = useState('');
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function setCert(on: boolean) {
    if (!slug.trim()) return setErr('Enter a lounge slug.');
    setBusy('cert'); setErr(''); setMsg('');
    try {
      const { error } = await supabaseBrowser().rpc('admin_set_certified', { p_slug: slug.trim(), p_on: on });
      if (error) throw new Error(error.message);
      setMsg(`Certification ${on ? 'granted' : 'removed'} for ${slug.trim()}.`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setBusy(null); }
  }

  async function assign() {
    if (!slug.trim() || !handle.trim()) return setErr('Enter both a lounge slug and a member handle.');
    setBusy('owner'); setErr(''); setMsg('');
    try {
      const { data, error } = await supabaseBrowser().rpc('admin_assign_owner', { p_slug: slug.trim(), p_handle: handle.trim().replace(/^@/, '') });
      if (error) throw new Error(error.message);
      setMsg(`Assigned ${data ?? handle.trim()} as owner of ${slug.trim()} (now a retailer account).`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setBusy(null); }
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-smoke-300">Manage a lounge’s certification and ownership. Use the lounge’s slug (from its URL, e.g. <code className="text-ember-200">deadwood-tobacco-co</code>).</p>

      <div>
        <label className="eyebrow mb-1 block">Lounge slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="lounge-slug"
          className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCert(true)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-3.5 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">
          {busy === 'cert' ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />} Grant certification
        </button>
        <button onClick={() => setCert(false)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-red-500/40 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
          {busy === 'cert' ? <Loader2 size={13} className="animate-spin" /> : <BadgeX size={13} />} Remove certification
        </button>
      </div>

      <div className="border-t border-ember-400/10 pt-4">
        <label className="eyebrow mb-1 block">Assign owner (member handle)</label>
        <div className="flex gap-2">
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle"
            className="flex-1 rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
          <button onClick={assign} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-3.5 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">
            {busy === 'owner' ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Assign
          </button>
        </div>
        <p className="mt-1 text-[11px] text-smoke-500">This converts the member to a retailer account and makes them the lounge owner.</p>
      </div>

      {msg && <p className="inline-flex items-center gap-1 text-xs text-ember-100"><Check size={12} strokeWidth={2} /> {msg}</p>}
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}
