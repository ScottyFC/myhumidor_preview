'use client';

import { useState } from 'react';
import { Store, Check, Loader2, Send } from 'lucide-react';
import { submitLounge } from '@/lib/lounge-submissions';
import { subscribeAuth } from '@/lib/auth';
import { useEffect } from 'react';
import Link from 'next/link';

export function SubmitLounge() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ name: '', address: '', city: '', state: '', phone: '', website: '', notes: '' });

  useEffect(() => subscribeAuth((s) => setSignedIn(!!s)), []);

  function set(k: keyof typeof f, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    if (!f.name.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    submitLounge({
      name: f.name.trim(),
      address: f.address.trim(),
      city: f.city.trim(),
      state: f.state.trim(),
      phone: f.phone.trim() || undefined,
      website: f.website.trim() || undefined,
      notes: f.notes.trim() || undefined,
    });
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border-[0.5px] border-ember-400/30 bg-ember-400/5 p-6 text-center">
        <Check className="mx-auto text-ember-400" size={26} strokeWidth={2} />
        <div className="mt-2 font-display text-lg">Thanks — your lounge is in the queue</div>
        <p className="mt-1 text-sm text-smoke-300">Our team will review it and add it to the directory.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-[0.5px] border-dashed border-ember-400/25 bg-char/40 px-6 py-5">
        <div>
          <div className="font-display text-lg">Don&apos;t see your lounge?</div>
          <div className="text-sm text-smoke-400">Submit it and our team will add it to the directory.</div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-ghost shrink-0">
          <Store size={14} strokeWidth={1.5} /> Submit your lounge
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-6">
      <div className="eyebrow mb-3">Submit your lounge</div>
      {!signedIn && (
        <p className="mb-3 text-xs text-smoke-400">
          You can submit now, but <Link href="/register" className="text-ember-100 underline-offset-2 hover:underline">signing in</Link> lets us track it to your account.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Lounge name" v={f.name} onChange={(v) => set('name', v)} placeholder="Corona Cigar Co." full />
        <Field label="Address" v={f.address} onChange={(v) => set('address', v)} placeholder="123 Main St" full />
        <Field label="City" v={f.city} onChange={(v) => set('city', v)} placeholder="Tampa" />
        <Field label="State" v={f.state} onChange={(v) => set('state', v)} placeholder="FL" />
        <Field label="Phone" v={f.phone} onChange={(v) => set('phone', v)} placeholder="(813) 555-0100" />
        <Field label="Website" v={f.website} onChange={(v) => set('website', v)} placeholder="https://" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={!f.name.trim() || busy}
          className="inline-flex items-center gap-2 rounded-md bg-ember-400 px-5 py-2 text-sm font-medium text-paper transition hover:bg-ember-600 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={1.5} />}
          Submit for review
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-smoke-400 hover:text-paper">Cancel</button>
      </div>
    </div>
  );
}

function Field({
  label, v, onChange, placeholder, full,
}: {
  label: string; v: string; onChange: (v: string) => void; placeholder?: string; full?: boolean;
}) {
  return (
    <label className={full ? 'sm:col-span-2 block' : 'block'}>
      <span className="eyebrow mb-1 block">{label}</span>
      <input
        value={v}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
      />
    </label>
  );
}
