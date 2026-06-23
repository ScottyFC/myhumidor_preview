'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check, X, Building2, ExternalLink } from 'lucide-react';
import { listBrandSignups, approveBrandSignup, rejectBrandSignup, brandSlugify, type BrandSignupRow } from '@/lib/brands';

export function BrandSignupQueue() {
  const [rows, setRows] = useState<BrandSignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { name: string; slug: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await listBrandSignups('pending');
    setRows(r);
    setEdits(Object.fromEntries(r.map((x) => [x.id, { name: x.company, slug: brandSlugify(x.company) }])));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approve(row: BrandSignupRow) {
    const e = edits[row.id]; setBusy(row.id); setMsg(null);
    const res = await approveBrandSignup(row.id, e.name, e.slug);
    setBusy(null);
    if (!res.ok) { setMsg(res.error ?? 'Approve failed.'); return; }
    setMsg(`Approved — “${e.name}” is now managed by the applicant.`);
    setRows((rs) => rs.filter((x) => x.id !== row.id));
  }
  async function reject(id: string) {
    setBusy(id); await rejectBrandSignup(id); setBusy(null);
    setRows((rs) => rs.filter((x) => x.id !== id));
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ember-400" /></div>;

  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Building2 size={18} className="text-ember-400" /> Brand applications</h2>
      <p className="mt-1 text-sm text-smoke-400">Approving links an existing brand (by slug) or creates a new one, attaches the applicant as owner, and provisions their subscription.</p>
      {msg && <p className="mt-3 rounded-lg border-[0.5px] border-ember-400/20 bg-ember-400/5 px-3 py-2 text-sm text-ember-200">{msg}</p>}

      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-smoke-400">No pending applications.</p>}
        {rows.map((r) => {
          const e = edits[r.id] ?? { name: r.company, slug: '' };
          return (
            <div key={r.id} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-paper">{r.company}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${r.tier === 'premium' ? 'bg-ember-400/20 text-ember-200' : 'bg-char/60 text-smoke-300'}`}>{r.tier}</span>
              </div>
              <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-smoke-300 sm:grid-cols-2">
                <div>Contact: <span className="text-paper">{r.contactName}</span></div>
                <div>Email: <span className="text-paper">{r.email}</span></div>
                {r.phone && <div>Phone: <span className="text-paper">{r.phone}</span></div>}
                {r.website && <div className="flex items-center gap-1">Web: <a href={r.website} target="_blank" rel="noreferrer" className="text-ember-400 underline">link <ExternalLink size={10} className="inline" /></a></div>}
                {r.businessAddress && <div className="sm:col-span-2">Address: <span className="text-paper">{r.businessAddress}</span></div>}
                {r.taxId && <div>Tax ID: <span className="text-paper">{r.taxId}</span></div>}
                {r.notes && <div className="sm:col-span-2">Notes: <span className="text-paper">{r.notes}</span></div>}
              </div>

              {r.tier === 'premium' && (
                <div className="mt-2 rounded-lg border-[0.5px] border-ember-400/20 bg-ember-400/5 px-3 py-2 text-xs text-ember-200">
                  Premium request — reach out to the applicant for tailored pricing. Approving provisions the brand with a <em>pending</em> subscription (set up custom billing off-platform).
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-xs text-smoke-400">Brand name
                  <input value={e.name} onChange={(ev) => setEdits({ ...edits, [r.id]: { ...e, name: ev.target.value } })}
                    className="mt-1 block w-48 rounded-md border-[0.5px] border-ember-400/20 bg-char/50 px-2 py-1.5 text-sm text-paper" />
                </label>
                <label className="text-xs text-smoke-400">Slug (links if it exists)
                  <input value={e.slug} onChange={(ev) => setEdits({ ...edits, [r.id]: { ...e, slug: ev.target.value } })}
                    className="mt-1 block w-48 rounded-md border-[0.5px] border-ember-400/20 bg-char/50 px-2 py-1.5 text-sm text-paper" />
                </label>
                <button onClick={() => approve(r)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
                  {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                </button>
                <button onClick={() => reject(r.id)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 rounded-lg border-[0.5px] border-ember-400/20 px-3 py-2 text-sm text-smoke-300 hover:text-red-300">
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
