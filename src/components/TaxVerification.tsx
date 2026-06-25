'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, Clock } from 'lucide-react';
import { getVerification, submitTaxInfo, type Verification } from '@/lib/broker';

export function TaxVerification({ onVerified }: { onVerified?: () => void }) {
  const [v, setV] = useState<Verification | null>(null);
  const [f, setF] = useState({ legalName: '', ein: '', businessType: '', address: '', contactEmail: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => { getVerification().then((r) => { if (r.ok) setV(r); }); }, []);

  async function submit() {
    setErr(null);
    if (!f.legalName.trim() || !f.ein.trim()) return setErr('Legal name and EIN are required.');
    setBusy(true); const r = await submitTaxInfo(f); setBusy(false);
    if (!r.ok) return setErr(r.error ?? 'Could not submit.');
    setDone(true); onVerified?.();
  }

  if (!v) return null;
  if (v.verified) return (
    <div className="flex items-center gap-2 rounded-xl border-[0.5px] border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">
      <ShieldCheck size={16} /> {v.premium ? 'Premier brand — verified automatically.' : 'Verified — you can sell wholesale.'}
    </div>
  );
  if (done || v.status === 'pending') return (
    <div className="flex items-center gap-2 rounded-xl border-[0.5px] border-ember-400/30 bg-ember-400/5 px-4 py-3 text-sm text-ember-100">
      <Clock size={16} /> Tax info submitted — verification is under review. You’ll be able to sell wholesale once approved.
    </div>
  );

  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/30 bg-char/40 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-ember-100"><ShieldAlert size={16} className="text-ember-400" /> Verify to sell wholesale</div>
      <p className="mt-1 text-xs text-smoke-400">Standard brands must submit business tax information before selling wholesale. Premier brands are verified automatically. Your information is stored securely and used only for verification.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Legal business name" value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} />
        <input className={input} placeholder="EIN (12-3456789)" value={f.ein} onChange={(e) => setF({ ...f, ein: e.target.value })} />
        <input className={input} placeholder="Business type (LLC, Corp…)" value={f.businessType} onChange={(e) => setF({ ...f, businessType: e.target.value })} />
        <input className={input} placeholder="Contact email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} />
        <input className={input + ' sm:col-span-2'} placeholder="Business address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      </div>
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
      <button onClick={submit} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Submit for verification</button>
    </div>
  );
}
