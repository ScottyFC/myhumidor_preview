'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Check, Loader2, Lock } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { requestVerification } from '@/lib/lounge-submissions';
import { getMyLounges, type MyLounge } from '@/lib/lounges-owner';

export default function VerifyPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [isLounge, setIsLounge] = useState(false);
  const [mine, setMine] = useState<MyLounge[]>([]);
  const [f, setF] = useState({
    name: '', address: '', city: '', state: '', phone: '', email: '',
    website: '', businessLicense: '', contactName: '', notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => subscribeAuth((s) => { setSignedIn(!!s); setIsLounge(s?.type === 'lounge'); }), []);
  useEffect(() => {
    getMyLounges().then((ls) => {
      setMine(ls);
      if (ls[0]) setF((prev) => ({ ...prev, name: prev.name || ls[0].name, city: prev.city || ls[0].city, state: prev.state || ls[0].state }));
    });
  }, [signedIn]);

  function set<K extends keyof typeof f>(k: K, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function submit() {
    if (!f.name.trim()) return setErr('Enter your lounge’s legal business name.');
    if (!signedIn) return setErr('Please sign in with your lounge account first.');
    setBusy(true); setErr('');
    const res = await requestVerification({
      name: f.name.trim(), address: f.address.trim(), city: f.city.trim(), state: f.state.trim(),
      phone: f.phone.trim(), email: f.email.trim(), website: f.website.trim(),
      businessLicense: f.businessLicense.trim(), contactName: f.contactName.trim(), notes: f.notes.trim(),
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setErr(res.error || 'Could not submit your request. Please try again.');
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-6 pt-16 text-center">
        <div className="rounded-xl border-[0.5px] border-ember-400/30 bg-ember-400/5 p-8">
          <Check className="mx-auto text-ember-400" size={36} strokeWidth={1.5} />
          <h1 className="font-display mt-3 text-3xl tracking-tightest">Submitted for review</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-smoke-200">
            Our team will review your business details and verify your lounge. You’ll see the verified badge on your lounge page once approved. Certification is available any time on our paid tiers.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/dashboard" className="btn-primary">Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pt-10">
      <div className="mb-2 inline-flex items-center gap-2 text-ember-400">
        <ShieldCheck size={18} strokeWidth={1.5} />
        <span className="eyebrow">Verify your lounge</span>
      </div>
      <h1 className="font-display text-4xl tracking-tightest">Verify your lounge</h1>
      <p className="mt-2 max-w-xl text-sm text-smoke-200">
        Submit details we can verify against public records. Once approved, your lounge is Verified (free) — it shows the verified badge and unlocks instant cigar approvals. Certification (the paid tier) adds priority placement and the certified badge.
      </p>

      {signedIn && !isLounge && (
        <div className="mt-4 flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/20 bg-ember-400/5 px-4 py-2 text-xs text-smoke-200">
          <Lock size={12} strokeWidth={1.5} className="text-ember-400" />
          Verification is for lounge accounts. Sign in with your lounge account to request it.
        </div>
      )}

      {mine.length > 0 && (
        <div className="mt-4 text-xs text-smoke-400">
          Requesting on behalf of <span className="text-ember-100">{mine.map((m) => m.name).join(', ')}</span>.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field full label="Legal business name" v={f.name} onChange={(v) => set('name', v)} placeholder="Your lounge, LLC" />
        <Field full label="Street address" v={f.address} onChange={(v) => set('address', v)} placeholder="123 Main St" />
        <Field label="City" v={f.city} onChange={(v) => set('city', v)} placeholder="Tampa" />
        <Field label="State" v={f.state} onChange={(v) => set('state', v)} placeholder="FL" />
        <Field label="Phone" v={f.phone} onChange={(v) => set('phone', v)} placeholder="(813) 555-0100" />
        <Field label="Business email" v={f.email} onChange={(v) => set('email', v)} placeholder="owner@yourlounge.com" />
        <Field full label="Website" v={f.website} onChange={(v) => set('website', v)} placeholder="https://yourlounge.com" />
        <Field full label="Business license / tax ID" v={f.businessLicense} onChange={(v) => set('businessLicense', v)} placeholder="License or registration number" />
        <Field full label="Owner / authorized contact name" v={f.contactName} onChange={(v) => set('contactName', v)} placeholder="Full name" />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-smoke-400">Anything else for our reviewers</label>
          <textarea
            value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3}
            placeholder="Hours, ownership history, or links that help us verify."
            className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
          />
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <>Submit for review</>}
        </button>
        <Link href="/dashboard" className="btn-ghost text-xs">Cancel</Link>
      </div>
    </div>
  );
}

function Field({
  label, v, onChange, placeholder, full,
}: { label: string; v: string; onChange: (v: string) => void; placeholder?: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs text-smoke-400">{label}</label>
      <input
        value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
      />
    </div>
  );
}
