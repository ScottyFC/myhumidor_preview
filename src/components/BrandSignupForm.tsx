'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, Building2 } from 'lucide-react';
import { Recaptcha } from '@/components/Recaptcha';
import type { BrandTier } from '@/lib/brands';

export function BrandSignupForm() {
  const [tier, setTier] = useState<BrandTier>('standard');
  const [f, setF] = useState({ contactName: '', company: '', businessAddress: '', email: '', website: '', phone: '', taxId: '', notes: '', password: '', confirm: '' });
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.contactName.trim() && f.company.trim() && f.email.trim() && f.password.length >= 8 && f.password === f.confirm && (tier === 'premium' || f.taxId.trim());

  async function submit() {
    setErr(null); setBusy(true);
    try {
      const r = await fetch('/api/brand-auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: f.contactName, company: f.company, businessAddress: f.businessAddress, email: f.email,
          website: f.website, phone: f.phone, taxId: f.taxId, notes: f.notes, password: f.password, tier, recaptchaToken: token,
        }),
      });
      const j = await r.json();
      setBusy(false);
      if (!r.ok || !j.ok) { setErr(j.error ?? 'Something went wrong.'); return; }
      setDone(true);
    } catch { setBusy(false); setErr('Network error.'); }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-[0.5px] border-ember-400/25 bg-char/40 p-6 text-center">
        <CheckCircle2 size={28} className="mx-auto text-ember-400" />
        <h3 className="mt-3 font-display text-xl">Application received</h3>
        <p className="mt-2 text-sm text-smoke-200">
          {tier === 'premium'
            ? 'Thanks — our team will reach out to discuss tailored Premium pricing for your marketing needs.'
            : 'Thanks — a super admin will review your application. Once approved, sign in at the brand portal with the email and password you just set.'}
        </p>
      </div>
    );
  }

  const inputCls = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';

  return (
    <div className="rounded-2xl border-[0.5px] border-ember-400/20 bg-char/30 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium"><Building2 size={16} className="text-ember-400" /> Brand application</div>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {(['standard', 'premium'] as BrandTier[]).map((t) => (
          <button key={t} onClick={() => setTier(t)}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${tier === t ? 'border-ember-400/60 bg-ember-400/10' : 'border-ember-400/15 bg-char/40'}`}>
            <div className="font-medium capitalize">{t}</div>
            <div className="text-xs text-smoke-400">{t === 'standard' ? '$300 / month' : 'Custom pricing'}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input className={inputCls} placeholder="Your name *" value={f.contactName} onChange={set('contactName')} />
        <input className={inputCls} placeholder="Company *" value={f.company} onChange={set('company')} />
        <input className={inputCls + ' sm:col-span-2'} placeholder="Business address" value={f.businessAddress} onChange={set('businessAddress')} />
        <input className={inputCls} placeholder="Email *" type="email" value={f.email} onChange={set('email')} />
        <input className={inputCls} placeholder="Contact number" value={f.phone} onChange={set('phone')} />
        <input className={inputCls} placeholder="Website" value={f.website} onChange={set('website')} />
        <input className={inputCls} placeholder={tier === 'premium' ? 'Federal / Tax ID' : 'Federal / Tax ID *'} value={f.taxId} onChange={set('taxId')} />
        <input className={inputCls} type="password" placeholder="Create a password * (8+ chars)" value={f.password} onChange={set('password')} />
        <input className={inputCls} type="password" placeholder="Confirm password *" value={f.confirm} onChange={set('confirm')} />
        <textarea className={inputCls + ' sm:col-span-2'} rows={3} placeholder={tier === 'premium' ? 'Tell us about your marketing needs' : 'Anything else? (optional)'} value={f.notes} onChange={set('notes')} />
      </div>

      <div className="mt-4 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-3 text-xs text-smoke-300">
        {tier === 'premium'
          ? 'Premium is custom-priced. Submitting sends a request to MyHumidor — no payment now; our team will contact you to tailor a plan. Once approved, sign in at the brand portal.'
          : 'Standard is $300/month: listing management, real-time analytics, 3 boosted posts/month (extra boosts billed separately), and one additional seat. Billing is set up after a super admin approves you; then sign in at the brand portal.'}
      </div>

      <div className="mt-4"><Recaptcha onToken={setToken} /></div>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      {f.password && f.confirm && f.password !== f.confirm && <p className="mt-2 text-xs text-red-300">Passwords don’t match.</p>}
      <button onClick={submit} disabled={!valid || busy}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-50">
        {busy ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : tier === 'premium' ? 'Request Premium pricing' : 'Apply for a brand account'}
      </button>
    </div>
  );
}
