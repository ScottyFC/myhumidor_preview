'use client';

import { useState } from 'react';
import { Star, Check } from 'lucide-react';
import { computeOverall, cn } from '@/lib/utils';

const TASTING_NOTES = [
  'Cocoa', 'Coffee', 'Leather', 'Pepper', 'Earth',
  'Cedar', 'Cream', 'Nuts', 'Citrus', 'Sweet',
  'Spice', 'Floral', 'Toast', 'Caramel', 'Vanilla',
];

interface Props {
  cigarId: string;
}

export function RatingForm({ cigarId }: Props) {
  const [flavor, setFlavor] = useState(0);
  const [burn, setBurn] = useState(0);
  const [appearance, setAppearance] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const allRated = flavor > 0 && burn > 0 && appearance > 0;
  const overall = allRated ? computeOverall(flavor, burn, appearance) : 0;

  function toggleNote(n: string) {
    const next = new Set(selectedNotes);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setSelectedNotes(next);
  }

  async function submit() {
    // TODO: wire to Supabase once configured. For now we just log.
    const payload = {
      cigarId,
      flavor,
      burn,
      appearance,
      overall,
      tastingNotes: Array.from(selectedNotes),
      notes,
    };
    console.log('Rating submitted', payload);
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

      <div className="mt-6 flex items-center justify-between border-t border-ember-400/10 pt-5">
        <div>
          <div className="eyebrow mb-1">Overall</div>
          <div className="font-display text-2xl tabular">
            {allRated ? overall.toFixed(1) : '—'}
            <span className="text-smoke-400 text-base"> / 5</span>
          </div>
        </div>
        <button
          disabled={!allRated}
          onClick={submit}
          className={cn(
            'rounded-md px-5 py-2 text-sm font-medium transition',
            allRated
              ? 'bg-ember-400 text-paper hover:bg-ember-600'
              : 'bg-smoke-800 text-smoke-400 cursor-not-allowed'
          )}
        >
          Save rating
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
