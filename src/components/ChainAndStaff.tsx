'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Building2, Loader2, Check } from 'lucide-react';
import { subscribeAuth, type Session } from '@/lib/auth';
import { getMyLounges, type MyLounge } from '@/lib/lounges-owner';
import { getStaff, setStaff, removeStaff, requestBulkClaim, type StaffMember } from '@/lib/lounge-staff';

/** Certified-lounge owner tools: scoped staff access + a bulk-claim request that
 *  goes to the super-admin queue. */
export function ChainAndStaff() {
  const [session, setSession] = useState<Session | null>(null);
  const [lounge, setLounge] = useState<MyLounge | null>(null);
  useEffect(() => subscribeAuth(setSession), []);
  useEffect(() => { getMyLounges().then((m) => setLounge(m.find((l) => l.certified) ?? m[0] ?? null)); }, [session]);

  if (!lounge || !lounge.certified) {
    return <p className="text-xs text-smoke-500">Staff access and multi-lounge claims are available on certified lounges.</p>;
  }
  return (
    <div className="space-y-8">
      <StaffPanel slug={lounge.slug} name={lounge.name} />
      <BulkClaim session={session} />
    </div>
  );
}

function StaffPanel({ slug, name }: { slug: string; name: string }) {
  const [staff, setStaffList] = useState<StaffMember[]>([]);
  const [handle, setHandle] = useState('');
  const [post, setPost] = useState(true);
  const [inv, setInv] = useState(false);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => getStaff(slug).then(setStaffList);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  async function add() {
    if (!handle.trim()) return;
    setBusy(true); setErr('');
    const res = await setStaff(slug, handle.trim(), { post, inventory: inv, edit });
    setBusy(false);
    if (res.ok) { setHandle(''); load(); } else setErr(res.error ?? 'Failed.');
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2"><Users size={16} className="text-ember-400" /><h3 className="font-display text-lg">Staff access <span className="text-sm text-smoke-400">· {name}</span></h3></div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="eyebrow mb-1 block">Member handle</label>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-smoke-200"><input type="checkbox" checked={post} onChange={(e) => setPost(e.target.checked)} className="accent-ember-400" /> Posting</label>
        <label className="flex items-center gap-1.5 text-xs text-smoke-200"><input type="checkbox" checked={inv} onChange={(e) => setInv(e.target.checked)} className="accent-ember-400" /> Inventory</label>
        <label className="flex items-center gap-1.5 text-xs text-smoke-200"><input type="checkbox" checked={edit} onChange={(e) => setEdit(e.target.checked)} className="accent-ember-400" /> Edit details</label>
        <button onClick={add} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-3.5 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Add</button>
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      {staff.length > 0 && (
        <ul className="mt-3 divide-y divide-ember-400/10 rounded-lg border-[0.5px] border-ember-400/15">
          {staff.map((s) => (
            <li key={s.userId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span><span className="text-paper">{s.displayName}</span> <span className="text-smoke-500">@{s.handle}</span>
                <span className="ml-2 text-[11px] text-smoke-400">{[s.canPost && 'posting', s.canInventory && 'inventory', s.canEdit && 'edit'].filter(Boolean).join(' · ') || 'no access'}</span>
              </span>
              <button onClick={async () => { await removeStaff(slug, s.userId); load(); }} aria-label="Remove" className="text-smoke-400 hover:text-red-400"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BulkClaim({ session }: { session: Session | null }) {
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!session) return;
    const slugs = raw.split(/[\n,]+/).map((s) => s.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean);
    if (slugs.length === 0) return setErr('List at least one lounge (slug or name).');
    setBusy(true); setErr('');
    const res = await requestBulkClaim(slugs, note, session.uuid, session.email?.split('@')[0] ?? 'Owner');
    setBusy(false);
    if (res.ok) { setDone(true); setRaw(''); setNote(''); } else setErr(res.error ?? 'Failed.');
  }

  return (
    <div className="border-t border-ember-400/10 pt-6">
      <div className="mb-2 flex items-center gap-2"><Building2 size={16} className="text-ember-400" /><h3 className="font-display text-lg">Claim multiple lounges</h3></div>
      <p className="mb-3 text-xs text-smoke-400">Run multiple locations? List them (one per line, slug or name) and we’ll send the request to the MyHumidor team for approval. Approved lounges are assigned to you as owner.</p>
      {done ? (
        <p className="inline-flex items-center gap-1 text-sm text-ember-100"><Check size={14} strokeWidth={2} /> Request sent for review.</p>
      ) : (
        <>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={3} placeholder={'cigar-castle-tampa\nking-corona-ybor'} className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything we should know? (optional)" className="mt-2 w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          <button onClick={submit} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Building2 size={13} />} Send claim request</button>
        </>
      )}
    </div>
  );
}
