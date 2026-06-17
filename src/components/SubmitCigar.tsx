'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Upload, X, Check, Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import type { CatalogCigar } from '@/types';
import { cn } from '@/lib/utils';
import { submitCigar, type SubmitResult } from '@/lib/submissions';
import { subscribeAuth } from '@/lib/auth';

const COMMON_SIZES = [
  'Robusto', 'Toro', 'Churchill', 'Corona', 'Torpedo', 'Figurado',
  'Lonsdale', 'Gordo', 'Petit Corona', 'Double Corona', 'Perfecto', 'Lancero',
];

const COUNTRIES = [
  'Nicaragua', 'Dominican Republic', 'Honduras', 'Cuba', 'U.S.A.', 'Mexico', 'Ecuador', 'Other',
];

export function SubmitCigar({ initialName = '' }: { initialName?: string }) {
  const [brand, setBrand] = useState('');
  const [name, setName] = useState(initialName);
  const [country, setCountry] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [buyUrl, setBuyUrl] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [authMsg, setAuthMsg] = useState('');

  // Duplicate detection
  const [dupes, setDupes] = useState<CatalogCigar[]>([]);
  const reqId = useRef(0);

  useEffect(() => subscribeAuth((s) => setSignedIn(!!s)), []);

  useEffect(() => {
    const q = `${brand} ${name}`.trim();
    if (q.length < 3) {
      setDupes([]);
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cigars?q=${encodeURIComponent(name || brand)}&limit=4`);
        const data = await res.json();
        if (id === reqId.current) setDupes(data.items ?? []);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [brand, name]);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoError('Image must be under 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  const valid = brand.trim() && name.trim() && size.trim();

  async function submit() {
    if (!valid) return;
    if (!signedIn) {
      setAuthMsg('Please sign in to submit a cigar — submissions are tied to your account.');
      return;
    }
    setSubmitting(true);
    setAuthMsg('');
    const res = await submitCigar({
      brand: brand.trim(),
      name: name.trim(),
      country: country.trim(),
      size: size.trim(),
      price: price ? parseFloat(price) : null,
      photoDataUrl: photo,
      notes: notes.trim() || undefined,
      buyUrl: buyUrl.trim() || undefined,
    });
    setSubmitting(false);
    setResult(res);
    setDone(true);
  }

  if (done) {
    const autoApproved = result?.autoApproved;
    return (
      <div className="rounded-xl border-[0.5px] border-ember-400/30 bg-ember-400/5 p-8 text-center">
        <Check className="mx-auto text-ember-400" size={36} strokeWidth={1.5} />
        <h2 className="font-display mt-3 text-2xl">{autoApproved ? 'Added to the catalog' : 'Posted — pending review'}</h2>
        {autoApproved ? (
          <p className="mx-auto mt-2 max-w-md text-sm text-smoke-200">
            <span className="text-paper">{brand} {name}</span> met the criteria and, as a verified lounge,
            was approved and pushed live immediately. It’s now public and searchable. (Logged for our records.)
          </p>
        ) : (
          <p className="mx-auto mt-2 max-w-md text-sm text-smoke-200">
            <span className="text-paper">{brand} {name}</span> will show on your profile and feed right away, but it
            stays visible to you until our team approves it. Once approved it becomes public and searchable for everyone.
          </p>
        )}
        {result?.duplicatePending && !autoApproved && (
          <p className="mx-auto mt-3 max-w-md rounded-md border-[0.5px] border-ember-400/30 bg-char/60 px-3 py-2 text-xs text-smoke-200">
            Heads up — another member already submitted this cigar and it’s pending review. That’s fine: you can keep
            posting about it, and we’ll make sure it only ends up in the catalog once.
          </p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={() => {
              setBrand(''); setName(''); setCountry(''); setSize('');
              setPrice(''); setNotes(''); setPhoto(undefined); setDone(false); setResult(null);
            }}
            className="btn-primary"
          >
            Submit another
          </button>
          <Link href="/search" className="btn-ghost">Back to search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/50 p-6">
      {/* Possible duplicates */}
      {dupes.length > 0 && (
        <div className="mb-5 rounded-lg border-[0.5px] border-ember-400/25 bg-ember-400/5 p-4">
          <div className="flex items-center gap-2 text-sm text-ember-100">
            <AlertCircle size={15} strokeWidth={1.5} />
            Possible matches already in the catalog — is it one of these?
          </div>
          <div className="mt-3 space-y-1.5">
            {dupes.map((d) => (
              <Link
                key={d.uuid}
                href={`/cigars/${d.slug}`}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition hover:bg-ember-400/10"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-smoke-400"> · {d.brand} · {d.size}</span>
                </span>
                <span className="shrink-0 text-xs text-ember-100">View →</span>
              </Link>
            ))}
          </div>
          <div className="mt-2 text-xs text-smoke-400">
            Not a match? Keep filling out the form below.
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand *">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} placeholder="e.g. Padrón" />
        </Field>
        <Field label="Cigar name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. 1964 Anniversary Exclusivo" />
        </Field>
        <Field label="Size / vitola *">
          <input value={size} onChange={(e) => setSize(e.target.value)} list="sizes" className={inputCls} placeholder="Robusto, Toro…" />
          <datalist id="sizes">
            {COMMON_SIZES.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
        <Field label="Country of origin">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="MSRP (USD)">
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.25" className={inputCls} placeholder="12.50" />
        </Field>
        <Field label="Notes (optional)">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Wrapper, blend, anything notable" />
        </Field>
        <Field label="Purchase link (optional)">
          <input value={buyUrl} onChange={(e) => setBuyUrl(e.target.value)} className={inputCls} placeholder="https://brand.com/this-cigar" />
        </Field>
      </div>

      {/* Photo upload */}
      <div className="mt-4">
        <span className="eyebrow mb-1.5 block">Photo (optional)</span>
        {photo ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Cigar preview" className="h-32 w-32 rounded-lg object-cover ring-1 ring-ember-400/20" />
            <button
              onClick={() => setPhoto(undefined)}
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-char text-paper ring-1 ring-ember-400/30"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <label className="flex w-full max-w-sm cursor-pointer items-center gap-3 rounded-lg border-[0.5px] border-dashed border-ember-400/30 px-4 py-4 text-sm text-smoke-300 hover:border-ember-400/50">
            <ImageIcon size={20} strokeWidth={1.5} className="text-ember-400" />
            <div>
              <div className="text-paper">Upload a photo</div>
              <div className="text-xs text-smoke-400">JPG or PNG, under 3 MB</div>
            </div>
            <Upload size={16} strokeWidth={1.5} className="ml-auto text-smoke-400" />
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
        )}
        {photoError && <div className="mt-1.5 text-xs text-red-400">{photoError}</div>}
      </div>

      {!signedIn && (
        <p className="mt-4 rounded-md border-[0.5px] border-ember-400/20 bg-char/60 p-3 text-sm text-smoke-200">
          Please <Link href="/register?next=/submit" className="text-ember-100 underline-offset-2 hover:underline">sign in</Link> to
          submit a cigar — submissions are tied to your account.
        </p>
      )}
      {authMsg && <p className="mt-3 text-sm text-red-300">{authMsg}</p>}

      <div className="mt-6 flex items-center gap-3 border-t border-ember-400/10 pt-5">
        <button
          onClick={submit}
          disabled={!valid || submitting || !signedIn}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition',
            valid && !submitting && signedIn ? 'bg-ember-400 text-paper hover:bg-ember-600' : 'bg-smoke-800 text-smoke-400'
          )}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2} />}
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
        <span className="text-xs text-smoke-400">* required</span>
      </div>
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
