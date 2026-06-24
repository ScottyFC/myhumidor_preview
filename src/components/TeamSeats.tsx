'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Users, UserPlus, X } from 'lucide-react';
import { getBrandTeam, inviteTeamMember, removeTeamMember, type TeamState } from '@/lib/brands';

export function TeamSeats() {
  const [state, setState] = useState<TeamState | null | undefined>(undefined);
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => setState((await getBrandTeam()) ?? null), []);
  useEffect(() => { load(); }, [load]);

  async function invite() {
    setErr(null); setMsg(null); setBusy(true);
    const r = await inviteTeamMember(email.trim()); setBusy(false);
    if (!r.ok) { setErr(r.error ?? 'Could not add seat.'); return; }
    setMsg(r.emailed ? 'Invite sent — they’ll get a set-password email.' : 'Seat added. Email isn’t configured, so share the password-reset link from the portal.');
    setEmail(''); load();
  }
  async function remove(id: string) { await removeTeamMember(id); load(); }

  const input = 'rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Users size={18} className="text-ember-400" /> Team seats</h2>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        {state === undefined ? <Loader2 className="animate-spin text-ember-400" /> : !state ? <p className="text-sm text-smoke-400">Couldn’t load your team.</p> : (
          <>
            <div className="text-xs text-smoke-400">{state.members.length} of {state.seats} seats used</div>
            <div className="mt-2 divide-y divide-ember-400/10">
              {state.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div><span className="text-paper">{m.email}</span> {m.id === state.self && <span className="text-[11px] text-smoke-500">(you)</span>}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${m.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{m.status}</span></div>
                  {m.id !== state.self && <button onClick={() => remove(m.id)} className="text-smoke-400 hover:text-red-300" aria-label="Remove"><X size={15} /></button>}
                </div>
              ))}
            </div>
            {state.members.length < state.seats ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input className={input + ' flex-1 min-w-[180px]'} type="email" placeholder="teammate@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button onClick={invite} disabled={busy || !email} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Add seat
                </button>
              </div>
            ) : <p className="mt-3 text-xs text-smoke-400">All seats are in use. Premium plans include more seats.</p>}
            {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
            {msg && <p className="mt-2 text-sm text-ember-200">{msg}</p>}
          </>
        )}
      </div>
    </section>
  );
}
