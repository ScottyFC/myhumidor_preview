'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { suggestAddresses, type AddressSuggestion } from '@/lib/geocode';

/**
 * Address field with Mapbox autocomplete. On selecting a suggestion it fills the
 * street address, city, and state, and reports back the coordinates so the
 * verify/claim flow can store an exact location (no separate geocode needed).
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPick,
  placeholder = 'Start typing your address…',
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: AddressSuggestion) => void;
  placeholder?: string;
}) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 3) { setItems([]); return; }
    setBusy(true);
    timer.current = setTimeout(async () => {
      const r = await suggestAddresses(value);
      setItems(r); setOpen(true); setBusy(false);
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value]);

  return (
    <div className="relative">
      <label className="mb-1 block text-xs text-smoke-400">Street address</label>
      <div className="relative">
        <MapPin size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-ember-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 py-2 pl-9 pr-9 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
        />
        {busy && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-smoke-400" />}
      </div>
      {open && items.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border-[0.5px] border-ember-400/25 bg-char shadow-xl">
            {items.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => { onPick(s); onChange(s.address); setOpen(false); }}
                  className="block w-full px-3 py-2 text-left text-sm text-smoke-200 hover:bg-ember-400/10 hover:text-ember-100"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
