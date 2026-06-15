'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthGate } from '@/lib/use-auth-gate';
import { Star, Check, ImagePlus, X, MapPin, Loader2 } from 'lucide-react';
import { computeOverall, cn } from '@/lib/utils';
import { getRating, setRating, uploadRatingPhoto } from '@/lib/ratings';
import { markSmoked } from '@/lib/collection';
import { createCheckIn } from '@/lib/checkins';

const TASTING_NOTES = [
  'Cocoa', 'Coffee', 'Leather', 'Pepper', 'Earth',
  'Cedar', 'Cream', 'Nuts', 'Citrus', 'Sweet',
  'Spice', 'Floral', 'Toast', 'Caramel', 'Vanilla',
];

interface Seed {
  cigarId: string;
  slug: string;
  brand: string;
  name: string;
  size: string;
}

interface Props {
  seed: Seed;
}

export function RatingForm({ seed }: Props) {
  const gate = useAuthGate();
  const [flavor, setFlavor] = useState(0);
  const [burn, setBurn] = useState(0);
  const [appearance, setAppearance] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [lounge, setLounge] = useState<{ slug: string; name: string } | null>(null);
  const [loungeQuery, setLoungeQuery] = useState('');
  const [loungeResults, setLoungeResults] = useState<Array<{ slug: string; name: string; city?: string }>>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prefill if the user has already rated this cigar.
  useEffect(() => {
    const existing = getRating(seed.cigarId);
    if (existing) {
      setFlavor(existing.flavor);
      setBurn(existing.burn);
      setAppearance(existing.appearance);
      setNotes(existing.notes ?? '');
      setSelectedNotes(new Set(existing.tastingNotes ?? []));
    }
  }, [seed.cigarId]);

  const allRated = flavor > 0 && burn > 0 && appearance > 0;
  const overall = allRated ? computeOverall(flavor, burn, appearance) : 0;

  function toggleNote(n: string) {
    const next = new Set(selectedNotes);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setSelectedNotes(next);
  }

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(f);
  }

  useEffect(() => {
    const q = loungeQuery.trim();
    if (q.length < 2 || lounge) { setLoungeResults([]); return; }
    let off = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stores?q=${encodeURIComponent(q)}&limit=6`);
        const d = await res.json();
        if (!off) setLoungeResults((d.items ?? []).map((s: { slug: string; name: string; city?: string }) => ({ slug: s.slug, name: s.name, city: s.city })));
      } catch { /* ignore */ }
    }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [loungeQuery, lounge]);

  async function submit() {
    setSaving(true);
    const photoUrl = photo ? (await uploadRatingPhoto(photo)) ?? undefined : undefined;

    setRating({
      cigarId: seed.cigarId,
      slug: seed.slug,
      brand: seed.brand,
      name: seed.name,
      size: seed.size,
      flavor,
      burn,
      appearance,
      overall,
      notes: notes.trim() || undefined,
      tastingNotes: Array.from(selectedNotes),
      photoUrl,
      loungeSlug: lounge?.slug,
      createdAt: new Date().toISOString(),
    });

    // Rating it means they smoked it → move out of the humidor into "Smoked".
    markSmoked({ cigarId: seed.cigarId, slug: seed.slug, brand: seed.brand, name: seed.name, size: seed.size });

    // Optional lounge check-in (skipped if they were smoking elsewhere).
    if (lounge) { try { await createCheckIn({ loungeSlug: lounge.slug, loungeName: lounge.name }); } catch { /* ignore */ } }

    setSaving(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border-[0.5px] border-ember-400/30 bg-ember-400/5 p-6 text-center">
        <Check className="mx-auto text-ember-400" size={32} strokeWidth={1.5} />
        <div className="font-display mt-3 text-lg">Rating saved</div>
        <div className="text-sm text-smoke-400 mt-1 tabular">Overall: {overall.toFixed(1)} / 5</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/60 p-6">
      <div className="eyebrow mb-4">Your rating</div>

      <div className="space-y-5">
        <StarRow label="Flavor profile" value={flavor} onChange={setFlavor} />
        <StarRow label="Burn performance" value={burn} onChange={setBurn} />
        <StarRow label="Appearance" value={appearance} onChange={setAppearance} />
      </div>

      <div className="mt-6 border-t border-ember-400/10 pt-5">
        <div className="eyebrow mb-3">Tasting notes</div>
        <div className="flex flex-wrap gap-1.5">
          {TASTING_NOTES.map((note) => {
            const active = selectedNotes.has(note);
            return (
              <button
                key={note}
                onClick={() => toggleNote(note)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs transition border-[0.5px]',
                  active
                    ? 'bg-ember-400/15 border-ember-400 text-ember-100'
                    : 'border-ember-400/20 text-smoke-200 hover:border-ember-400/40'
                )}
              >
                {note}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-ember-400/10 pt-5">
        <label className="eyebrow mb-2 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Pairing, occasion, environment..."
          rows={3}
          className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
        />
      </div>

      {/* Photo of this cigar (optional) */}
      <div className="mt-6 border-t border-ember-400/10 pt-5">
        <label className="eyebrow mb-2 block">Add a photo (optional)</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
        {photo ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="your cigar" className="max-h-40 rounded-lg object-cover" />
            <button onClick={() => setPhoto(undefined)} className="absolute -right-2 -top-2 rounded-full bg-char p-1 text-smoke-300 hover:text-red-400" aria-label="Remove photo">
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="btn-ghost text-xs">
            <ImagePlus size={14} strokeWidth={1.5} /> Add photo
          </button>
        )}
        <p className="mt-1.5 text-[11px] text-smoke-500">Your photo joins the “Photos of This Cigar” gallery.</p>
      </div>

      {/* Check in to a lounge (optional — skip if smoking elsewhere) */}
      <div className="mt-6 border-t border-ember-400/10 pt-5">
        <label className="eyebrow mb-2 flex items-center gap-1.5"><MapPin size={12} strokeWidth={1.5} className="text-ember-400" /> Smoking at a lounge? (optional)</label>
        {lounge ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-ember-400/10 px-3 py-1.5 text-xs text-ember-100 ring-1 ring-ember-400/25">
            {lounge.name}
            <button onClick={() => { setLounge(null); setLoungeQuery(''); }} aria-label="Clear lounge"><X size={12} strokeWidth={1.5} /></button>
          </div>
        ) : (
          <div className="relative max-w-sm">
            <input
              value={loungeQuery}
              onChange={(e) => setLoungeQuery(e.target.value)}
              placeholder="Search a lounge to check in… (or skip)"
              className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
            />
            {loungeResults.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border-[0.5px] border-ember-400/25 bg-char shadow-xl">
                {loungeResults.map((r) => (
                  <li key={r.slug}>
                    <button onClick={() => { setLounge({ slug: r.slug, name: r.name }); setLoungeResults([]); }}
                      className="block w-full px-3 py-2 text-left text-sm text-smoke-200 hover:bg-ember-400/10 hover:text-ember-100">
                      {r.name}{r.city ? <span className="text-smoke-500"> · {r.city}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-ember-400/10 pt-5">
        <div>
          <div className="eyebrow mb-1">Overall</div>
          <div className="font-display text-2xl tabular">
            {allRated ? overall.toFixed(1) : '—'}
            <span className="text-smoke-400 text-base"> / 5</span>
          </div>
        </div>
        <button
          disabled={!allRated || saving}
          onClick={gate(submit)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition',
            allRated && !saving
              ? 'bg-ember-400 text-paper hover:bg-ember-600'
              : 'bg-smoke-800 text-smoke-400 cursor-not-allowed'
          )}
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Save rating
        </button>
      </div>
    </div>
  );
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-smoke-200">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-label={`${label}: ${n} stars`}
            className="p-0.5"
          >
            <Star
              size={22}
              strokeWidth={1.5}
              className={
                n <= value
                  ? 'fill-ember-400 text-ember-400'
                  : 'text-smoke-400 hover:text-ember-100'
              }
            />
          </button>
        ))}
      </div>
    </div>
  );
}
