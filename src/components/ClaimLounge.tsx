'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ShieldCheck, Upload, Check, Loader2, Package } from 'lucide-react';
import type { CatalogStore } from '@/types';
import { cn } from '@/lib/utils';

const STORE_KEY = 'myhumidor:active-store';
const claimKey = (id: string) => `myhumidor:claim:${id}`;

interface Props {
  store: CatalogStore;
  alreadyVerified: boolean;
}

export function ClaimLounge({ store, alreadyVerified }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [managesThis, setManagesThis] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const active = localStorage.getItem(STORE_KEY);
      if (active) {
        const a: CatalogStore = JSON.parse(active);
        if (a.id === store.id) setManagesThis(true);
      }
      if (localStorage.getItem(claimKey(store.id))) setClaimed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [store.id]);

  function onClaimed() {
    // Demo: record the claim and set this lounge as the browser's managed store
    try {
      localStorage.setItem(claimKey(store.id), '1');
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* ignore */
    }
    setClaimed(true);
    setManagesThis(true);
  }

  if (!hydrated) return null;

  // Owner already manages this lounge
  if (managesThis || claimed) {
    return (
      <div className="rounded-xl border-[0.5px] border-ember-400/30 bg-ember-400/5 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} strokeWidth={1.5} className="text-ember-400" />
          <div className="font-display text-lg">You manage this lounge</div>
        </div>
        <p className="mt-1 text-sm text-smoke-200">
          {claimed && !alreadyVerified
            ? 'Your claim is in review — verification typically completes within 48 hours. In the meantime you can set up your menu.'
            : 'Add the cigars you carry and set prices so they surface to nearby members.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/inventory" className="btn-primary">
            <Package size={15} strokeWidth={1.5} /> Manage inventory
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Open dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-6">
      <div className="flex items-center gap-2">
        <BadgeCheck size={18} strokeWidth={1.5} className="text-ember-400" />
        <div className="font-display text-lg">Own or manage {store.name}?</div>
      </div>
      <p className="mt-1 text-sm text-smoke-200">
        Claim this lounge to get the verified check, list your live menu, run the free CigarTV TV
        stick, and start earning credits from viewership.
      </p>

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary mt-4">
          Claim this lounge
        </button>
      ) : (
        <ClaimForm store={store} onClaimed={onClaimed} />
      )}
    </div>
  );
}

function ClaimForm({ store, onClaimed }: { store: CatalogStore; onClaimed: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Owner');
  const [email, setEmail] = useState(store.email || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [attest, setAttest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valid = name.trim() && email.trim() && attest;

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    // TODO: POST to a claims endpoint; in production this creates a verification
    // record and notifies the team. Here we simulate a short delay.
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    onClaimed();
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Jane Doe" />
        </Field>
        <Field label="Your role">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            <option>Owner</option>
            <option>General manager</option>
            <option>Manager</option>
          </select>
        </Field>
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} placeholder="you@lounge.com" />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(813) 555-0100" />
        </Field>
      </div>

      <Field label="Verification — business license or storefront photo">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border-[0.5px] border-dashed border-ember-400/30 px-3 py-2.5 text-sm text-smoke-400 hover:border-ember-400/50">
          <Upload size={15} strokeWidth={1.5} className="text-ember-400" />
          <span>Choose a file…</span>
          <input type="file" className="hidden" />
        </label>
      </Field>

      <label className="flex items-start gap-2 text-xs text-smoke-200">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5" />
        I confirm I&apos;m authorized to represent {store.name}.
      </label>

      <button
        onClick={submit}
        disabled={!valid || submitting}
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition',
          valid && !submitting ? 'bg-ember-400 text-paper hover:bg-ember-600' : 'bg-smoke-800 text-smoke-400'
        )}
      >
        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2} />}
        {submitting ? 'Submitting…' : 'Submit claim'}
      </button>
    </div>
  );
}

const inputCls =
  'w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
