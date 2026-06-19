'use client';

import { useEffect, useState } from 'react';
import { Building2, Check, X, Loader2 } from 'lucide-react';
import { getClaimRequests, reviewClaim, type ClaimRequest } from '@/lib/lounge-staff';

/** Super-admin: review bulk lounge-claim requests. */
export function ClaimRequestsQueue() {
  const [reqs, setReqs] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); getClaimRequests().then((r) => { setReqs(r); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  async function act(id: string, approve: boolean) {
    setBusy(id); setMsg('');
    const res = await reviewClaim(id, approve);
    setBusy(null);
    if (res.ok) { setMsg(approve ? `Approved — ${res.count ?? 0} lounge(s) assigned.` : 'Request rejected.'); load(); }
    else setMsg(res.error ?? 'Failed.');
  }

  if (loading) return <div className="text-smoke-400"><Loader2 className="animate-spin text-ember-400" /></div>;

  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm text-smoke-300">Bulk lounge-claim requests from owners. Approving assigns every listed lounge to the requester and makes them a retailer/owner.</p>
      {msg && <p className="mb-3 rounded-lg border-[0.5px] border-ember-400/25 bg-ember-400/10 px-3 py-2 text-sm text-ember-100">{msg}</p>}
      {reqs.length === 0 ? (
        <p className="text-sm text-smoke-400">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {reqs.map((r) => (
            <li key={r.id} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
              <div className="flex items-center gap-2 text-sm"><Building2 size={14} className="text-ember-400" /><span className="font-medium text-paper">{r.requesterName}</span><span className="text-smoke-500">· {new Date(r.createdAt).toLocaleDateString()}</span></div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.loungeSlugs.map((sl) => <span key={sl} className="rounded-full border-[0.5px] border-ember-400/20 px-2.5 py-0.5 text-xs text-smoke-200">{sl}</span>)}
              </div>
              {r.note && <p className="mt-2 text-xs text-smoke-400">“{r.note}”</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => act(r.id, true)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">{busy === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve</button>
                <button onClick={() => act(r.id, false)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-red-500/40 px-3.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"><X size={12} /> Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
