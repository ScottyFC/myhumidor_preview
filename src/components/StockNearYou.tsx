'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PackageCheck, MapPin } from 'lucide-react';

interface StockRow {
  loungeSlug: string; loungeName: string; city: string | null; state: string | null;
  price: number | null; distanceMi: number | null; updatedAt: string | null;
}

/**
 * "In stock near you" — asks for the visitor's location and shows lounges that
 * have this cigar in stock right now (live inventory via the cigar_stock_near
 * RPC). Renders nothing when location is denied or no one nearby stocks it.
 */
export function StockNearYou({ slug }: { slug: string }) {
  const [rows, setRows] = useState<StockRow[] | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let off = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/cigars/${encodeURIComponent(slug)}/stock-near?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
          );
          const d = await res.json();
          if (!off) setRows(d.items ?? []);
        } catch { if (!off) setRows([]); }
      },
      () => { if (!off) setRows([]); },
      { maximumAge: 300_000, timeout: 8_000 },
    );
    return () => { off = true; };
  }, [slug]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="eyebrow mb-3 flex items-center gap-1.5">
        <PackageCheck size={11} strokeWidth={1.5} className="text-ember-400" />
        In stock near you
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.slice(0, 6).map((r) => (
          <Link
            key={r.loungeSlug}
            href={`/lounges/${r.loungeSlug}`}
            className="group rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:border-ember-400/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium group-hover:text-ember-100">{r.loungeName}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-smoke-400">
                  <MapPin size={11} strokeWidth={1.5} />
                  {[r.city, r.state].filter(Boolean).join(', ')}
                  {typeof r.distanceMi === 'number' && ` · ${r.distanceMi.toFixed(1)} mi`}
                </div>
              </div>
              {typeof r.price === 'number' && (
                <span className="shrink-0 font-display text-base tabular text-ember-100">${r.price.toFixed(2)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
