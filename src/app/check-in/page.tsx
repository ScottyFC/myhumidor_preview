'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame, Star, Upload, X, Loader2, Check, Search } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { createCheckIn } from '@/lib/checkins';
import type { CatalogCigar, CatalogStore } from '@/types';

export default function CheckInPage() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [cigar, setCigar] = useState<{ slug: string; brand: string; name: string } | null>(null);
  const [lounge, setLounge] = useState<{ slug: string; name: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => subscribeAuth((s) => setSignedIn(!!s)), []);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/') || f.size > 5 * 1024 * 1024) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  }

  async function submit() {
    if (!cigar) return;
    setBusy(true);
    const ok = await createCheckIn({
      cigarSlug: cigar.slug, cigarBrand: cigar.brand, cigarName: cigar.name,
      loungeSlug: lounge?.slug, loungeName: lounge?.name,
      rating: rating || undefined, review: review.trim() || undefined, photoDataUrl: photo,
    });
    setBusy(false);
    if (ok) setDone(true);
  }

  if (signedIn === null) {
    return <div className="mx-auto max-w-xl px-6 py-20 text-center"><Loader2 className="mx-auto animate-spin text-ember-400" /></div>;
  }
  if (!signedIn) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl">Check in</h1>
        <p className="mt-2 text-smoke-300">Please <Link href="/register?next=/check-in" className="text-ember-100 underline-offset-2 hover:underline">sign in</Link> to check in.</p>
      </div>
    );
  }
  if (done) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <Check className="mx-auto text-ember-400" size={36} strokeWidth={1.5} />
        <h1 className="mt-3 font-display text-2xl">Checked in</h1>
        <p className="mt-1 text-smoke-300">Your check-in is live on your followers’ feed{lounge ? ` and ${lounge.name}’s page` : ''}.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/profile" className="btn-primary">View profile</Link>
          <button onClick={() => { setDone(false); setCigar(null); setLounge(null); setRating(0); setReview(''); setPhoto(undefined); }} className="btn-ghost">Check in again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 pt-10">
      <div className="eyebrow mb-2 flex items-center gap-1.5"><Flame size={13} strokeWidth={1.5} className="text-ember-400" /> Check in</div>
      <h1 className="font-display text-4xl tracking-tightest">What are you smoking?</h1>
      <p className="mt-2 text-sm text-smoke-300">Share the cigar, where you are, your take, and a photo. It posts to your followers and the lounge.</p>

      <div className="mt-8 space-y-5">
        <Picker label="Cigar" required kind="cigars" placeholder="Search cigars…"
          value={cigar ? `${cigar.brand} ${cigar.name}` : ''}
          onPick={(it) => setCigar({ slug: it.slug, brand: (it as CatalogCigar).brand, name: it.name })}
          onClear={() => setCigar(null)} />

        <Picker label="Lounge (optional)" kind="stores" placeholder="Search lounges & shops…"
          value={lounge ? lounge.name : ''}
          onPick={(it) => setLounge({ slug: it.slug, name: it.name })}
          onClear={() => setLounge(null)} />

        <div>
          <div className="eyebrow mb-1.5">Rating</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n === rating ? 0 : n)} aria-label={`${n} stars`}>
                <Star size={26} strokeWidth={1.5} className={n <= rating ? 'fill-ember-400 text-ember-400' : 'text-smoke-500'} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="eyebrow mb-1.5">Review</div>
          <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} placeholder="Draw, flavor, the moment…"
            className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none" />
        </div>

        <div>
          <div className="eyebrow mb-1.5">Photo</div>
          {photo ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="check-in" className="h-40 w-40 rounded-lg object-cover" />
              <button onClick={() => setPhoto(undefined)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-char ring-1 ring-ember-400/30"><X size={13} /></button>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-sm text-ember-100 hover:bg-ember-400/10">
              <Upload size={14} strokeWidth={1.5} /> Add a photo
              <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
            </label>
          )}
        </div>

        <button onClick={submit} disabled={!cigar || busy} className="inline-flex items-center gap-2 rounded-md bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper hover:bg-ember-600 disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Flame size={15} strokeWidth={1.5} />} Post check-in
        </button>
      </div>
    </div>
  );
}

function Picker({
  label, kind, placeholder, value, required, onPick, onClear,
}: {
  label: string; kind: 'cigars' | 'stores'; placeholder: string; value: string; required?: boolean;
  onPick: (it: CatalogCigar | CatalogStore) => void; onClear: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<(CatalogCigar | CatalogStore)[]>([]);
  const [open, setOpen] = useState(false);
  const req = useRef(0);

  useEffect(() => {
    if (value) return;
    if (q.trim().length < 2) { setResults([]); return; }
    const id = ++req.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/${kind}?q=${encodeURIComponent(q)}&limit=6`);
        const data = await res.json();
        if (id === req.current) { setResults(data.items ?? []); setOpen(true); }
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [q, kind, value]);

  if (value) {
    return (
      <div>
        <div className="eyebrow mb-1.5">{label}</div>
        <div className="flex items-center justify-between rounded-md border-[0.5px] border-ember-400/30 bg-ember-400/5 px-3 py-2 text-sm">
          <span className="text-paper">{value}</span>
          <button onClick={onClear} className="text-smoke-400 hover:text-paper"><X size={15} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="eyebrow mb-1.5">{label}{required && <span className="text-ember-400"> *</span>}</div>
      <div className="flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3">
        <Search size={14} strokeWidth={1.5} className="text-smoke-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
          className="w-full bg-transparent py-2 text-sm text-paper placeholder:text-smoke-400 focus:outline-none" />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border-[0.5px] border-ember-400/20 bg-char shadow-xl">
          {results.map((it) => (
            <button key={it.slug} onClick={() => { onPick(it); setOpen(false); setResults([]); }}
              className="block w-full px-3 py-2 text-left text-sm text-smoke-200 hover:bg-ember-400/10">
              {'brand' in it && (it as CatalogCigar).brand ? `${(it as CatalogCigar).brand} · ` : ''}{it.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
