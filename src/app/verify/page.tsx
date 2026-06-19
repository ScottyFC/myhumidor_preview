'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Check, Loader2, Lock } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { requestVerification } from '@/lib/lounge-submissions';
import { getMyLounges, setCertTier, submitClaim, type MyLounge } from '@/lib/lounges-owner';
import { PLAN_TIERS, startCheckout, type Tier } from '@/lib/billing';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

export default function VerifyPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [isLounge, setIsLounge] = useState(false);
  const [mine, setMine] = useState<MyLounge[]>([]);
  const [f, setF] = useState({
    name: '', address: '', city: '', state: '', phone: '', email: '',
    website: '', businessLicense: '', contactName: '', notes: '',
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [step, setStep] = useState<'details' | 'plan'>('details');
  const [referral, setReferral] = useState('');
  const [matchedSlug, setMatchedSlug] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ slug: string; name: string; address: string; city: string; state: string; phone?: string; website?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [planBusy, setPlanBusy] = useState<string | null>(null);

  useEffect(() => subscribeAuth((s) => { setSignedIn(!!s); setIsLounge(s?.type === 'retailer'); }), []);
  useEffect(() => {
    getMyLounges().then((ls) => {
      setMine(ls);
      if (ls[0]) setF((prev) => ({ ...prev, name: prev.name || ls[0].name, city: prev.city || ls[0].city, state: prev.state || ls[0].state }));
    });
  }, [signedIn]);

  function set<K extends keyof typeof f>(k: K, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function searchLounges() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/stores?q=${encodeURIComponent(query.trim())}&limit=6`);
      const data = await res.json();
      setResults((data.items ?? []).map((s2: { slug: string; name: string; address?: string; city?: string; state?: string; phone?: string; website?: string }) => ({
        slug: s2.slug, name: s2.name, address: s2.address ?? '', city: s2.city ?? '', state: s2.state ?? '', phone: s2.phone, website: s2.website,
      })));
    } finally { setSearching(false); }
  }

  function prefill(r: { slug: string; name: string; address: string; city: string; state: string; phone?: string; website?: string }) {
    setMatchedSlug(r.slug);
    setF((p) => ({ ...p, name: r.name, address: r.address, city: r.city, state: r.state, phone: r.phone || p.phone, website: r.website || p.website }));
    setResults([]); setQuery(r.name);
  }

  async function submit() {
    if (!f.name.trim()) return setErr('Enter your lounge’s legal business name.');
    if (!signedIn) return setErr('Please sign in with your lounge account first.');
    setBusy(true); setErr('');
    const res = await requestVerification({
      name: f.name.trim(), address: f.address.trim(), city: f.city.trim(), state: f.state.trim(),
      phone: f.phone.trim(), email: f.email.trim(), website: f.website.trim(),
      businessLicense: f.businessLicense.trim(), contactName: f.contactName.trim(),
      notes: [f.notes.trim(), referral.trim() ? `Referral code: ${referral.trim()}` : ''].filter(Boolean).join('\n'),
      lat: coords?.lat, lng: coords?.lng,
    });
    if (res.ok && matchedSlug) {
      // Existing lounge — also file a claim so an admin can assign ownership.
      try { await submitClaim({ loungeSlug: matchedSlug, loungeName: f.name.trim(), claimantName: f.contactName.trim() || f.name.trim(), roleRequested: 'owner', email: f.email.trim(), phone: f.phone.trim() }); } catch { /* non-blocking */ }
    }
    setBusy(false);
    if (res.ok) setStep('plan');
    else setErr(res.error || 'Could not submit your request. Please try again.');
  }

  async function choosePlan(tier: Tier) {
    setPlanBusy(tier); setErr('');
    const lounge = mine[0];
    if (lounge) {
      const res = await startCheckout(lounge.slug, tier);
      if (res.url) { window.location.href = res.url; return; }
      if (res.fallback) await setCertTier(lounge.loungeId, tier);
    }
    // New lounges (still pending verification) record the choice; it's applied
    // once the lounge is approved/assigned.
    setPlanBusy(null);
    setDone(true);
  }

  if (step === 'plan' && !done) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-10">
        <div className="mb-2 inline-flex items-center gap-2 text-ember-400"><ShieldCheck size={18} strokeWidth={1.5} /><span className="eyebrow">Choose your plan</span></div>
        <h1 className="font-display text-4xl tracking-tightest">Pick a plan</h1>
        <p className="mt-2 max-w-xl text-sm text-smoke-200">Your details are in for review. Choose a certification plan now, or start free and upgrade later.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLAN_TIERS.map((t) => (
            <div key={t.id} className="rounded-2xl border-[0.5px] border-ember-400/15 bg-char/40 p-5">
              <div className="font-display text-lg">{t.name}</div>
              <div className="mt-1 font-display text-3xl text-ember-100">{t.price}</div>
              <p className="mt-1 text-xs text-smoke-400">{t.blurb}</p>
              <ul className="mt-3 space-y-1.5">
                {t.features.map((ft) => <li key={ft} className="flex items-start gap-1.5 text-xs text-smoke-200"><Check size={12} className="mt-0.5 shrink-0 text-ember-400" /> {ft}</li>)}
              </ul>
              <button onClick={() => choosePlan(t.id)} disabled={!!planBusy} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-ember-400 px-3 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-60">
                {planBusy === t.id ? <Loader2 size={13} className="animate-spin" /> : null} Choose {t.name}
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setDone(true)} className="mt-5 text-sm text-smoke-400 underline hover:text-smoke-200">Start free for now</button>
      </div>
    );
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

      <div className="mt-6 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        <label className="mb-1 block text-xs text-smoke-400">Already listed? Search and pre-fill</label>
        <div className="flex gap-2">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchLounges(); }}
            placeholder="Search your lounge by name…"
            className="flex-1 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
          />
          <button onClick={searchLounges} disabled={searching} className="btn-ghost text-xs">{searching ? <Loader2 size={13} className="animate-spin" /> : 'Search'}</button>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-ember-400/10 rounded-md border-[0.5px] border-ember-400/15">
            {results.map((r) => (
              <li key={r.slug}>
                <button onClick={() => prefill(r)} className="block w-full px-3 py-2 text-left text-sm text-smoke-200 hover:bg-ember-400/10 hover:text-paper">
                  {r.name} <span className="text-xs text-smoke-500">{[r.city, r.state].filter(Boolean).join(', ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {matchedSlug && <p className="mt-1.5 text-[11px] text-ember-100">✓ Pre-filled from our directory — we’ll file your ownership claim with this submission.</p>}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field full label="Legal business name" v={f.name} onChange={(v) => set('name', v)} placeholder="Your lounge, LLC" />
        <div className="sm:col-span-2">
          <AddressAutocomplete
            value={f.address}
            onChange={(v) => { set('address', v); setCoords(null); }}
            onPick={(s) => {
              setF((p) => ({ ...p, address: s.address, city: s.city || p.city, state: s.state || p.state }));
              setCoords({ lat: s.lat, lng: s.lng });
            }}
          />
          {coords && (
            <p className="mt-1 text-[11px] text-ember-100">
              ✓ Location pinned — your lounge will appear on the map once approved.
            </p>
          )}
        </div>
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

      <div className="mt-4 max-w-xs">
        <label className="mb-1 block text-xs text-smoke-400">Referral code <span className="text-smoke-600">(optional)</span></label>
        <input
          value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="e.g. CIGARTV"
          className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
        />
      </div>

      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <>Continue to plan →</>}
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
