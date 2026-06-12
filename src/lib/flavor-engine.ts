import 'server-only';

import { allCigars, findCatalogCigarBySlug } from '@/lib/catalog';
import type { CatalogCigar } from '@/types';

/**
 * Flavor Profiling engine.
 *
 * Builds a taste vector from the member's history — every rating contributes
 * signed weight (5★ ≈ +2, 2★ ≈ −1), so dislikes steer away, not just likes
 * toward. Signals (the catalog carries brand/country/vitola/price, so those are
 * the axes we can honestly score on):
 *
 *   brand affinity    ×3.0   strongest predictor of "more like this"
 *   country affinity  ×2.0   origin ≈ tobacco character (Nicaragua ≠ Connecticut)
 *   vitola affinity   ×1.25  format preference (ring/length changes the smoke)
 *   price fit         ×1.0   stays inside the band they actually buy in
 *
 * Tasting notes the member logs on ratings (e.g. cocoa, leather, pepper) are
 * attached to the countries/brands of the cigars they came from, which lets the
 * explanation say *why* in their own vocabulary.
 *
 * Output is diversified (max 2 per brand, and a same-brand pick can't fill the
 * top slot twice in a row) with a short user-facing `why` per pick.
 */

export interface HistoryRating {
  slug: string;
  overall: number;          // 1..5
  tastingNotes?: string[];
}

export interface FlavorHistory {
  ratings: HistoryRating[];
  ownedSlugs?: string[];    // humidor + wishlist — excluded from results
}

export interface FlavorPick {
  slug: string;
  brand: string;
  name: string;
  country: string | null;
  size: string;
  price: number | null;
  image_url?: string | null;
  score: number;
  why: string;
}

const W_BRAND = 3.0;
const W_NOTES = 2.0; // per-SKU flavor_tags vs the member's logged tasting notes
const W_COUNTRY = 2.0;
const W_SIZE = 1.25;
const W_PRICE = 1.0;

function normSize(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

export function recommend(history: FlavorHistory, limit = 5): FlavorPick[] {
  const ratings = (history.ratings ?? []).filter((r) => r.slug && r.overall >= 1);
  if (ratings.length === 0) return [];

  const exclude = new Set<string>([
    ...ratings.map((r) => r.slug),
    ...(history.ownedSlugs ?? []),
  ]);

  // ── Build the taste vector ────────────────────────────────────────────────
  const brandAff = new Map<string, number>();
  const countryAff = new Map<string, number>();
  const sizeAff = new Map<string, number>();
  const notesByCountry = new Map<string, Map<string, number>>();
  const anchorByBrand = new Map<string, { name: string; overall: number }>();
  const anchorByCountry = new Map<string, { name: string; overall: number }>();
  const likedPrices: number[] = [];
  const allNotes = new Map<string, number>();

  for (const r of ratings) {
    const cat = findCatalogCigarBySlug(r.slug);
    if (!cat) continue;
    const w = r.overall - 3; // 5★→+2 … 1★→−2
    const brand = cat.brand?.toLowerCase() ?? '';
    const country = cat.country?.toLowerCase() ?? '';
    const size = normSize(cat.size);

    if (brand) brandAff.set(brand, (brandAff.get(brand) ?? 0) + w);
    if (country) countryAff.set(country, (countryAff.get(country) ?? 0) + w);
    if (size) sizeAff.set(size, (sizeAff.get(size) ?? 0) + w);

    if (w > 0) {
      if (typeof cat.price === 'number') likedPrices.push(cat.price);
      // Remember their highest-rated cigar per brand/country to cite as anchor.
      const a = anchorByBrand.get(brand);
      if (brand && (!a || r.overall > a.overall)) anchorByBrand.set(brand, { name: cat.name, overall: r.overall });
      const ac = anchorByCountry.get(country);
      if (country && (!ac || r.overall > ac.overall)) anchorByCountry.set(country, { name: cat.name, overall: r.overall });
      for (const note of r.tastingNotes ?? []) {
        const n = note.toLowerCase().trim();
        if (!n) continue;
        allNotes.set(n, (allNotes.get(n) ?? 0) + w);
        if (country) {
          const m = notesByCountry.get(country) ?? new Map<string, number>();
          m.set(n, (m.get(n) ?? 0) + w);
          notesByCountry.set(country, m);
        }
      }
    }
  }

  const priceMid = likedPrices.length
    ? likedPrices.sort((a, b) => a - b)[Math.floor(likedPrices.length / 2)]
    : null;

  // ── Score every candidate ────────────────────────────────────────────────
  type Scored = { c: CatalogCigar; score: number; parts: { brand: number; country: number; size: number; price: number; notes: string[] } };
  const scored: Scored[] = [];

  for (const c of allCigars()) {
    if (exclude.has(c.slug)) continue;
    const b = brandAff.get(c.brand?.toLowerCase() ?? '') ?? 0;
    const k = countryAff.get(c.country?.toLowerCase() ?? '') ?? 0;
    const s = sizeAff.get(normSize(c.size)) ?? 0;
    let p = 0;
    if (priceMid != null && typeof c.price === 'number') {
      const rel = Math.abs(c.price - priceMid) / Math.max(priceMid, 1);
      p = Math.max(0, 1 - rel); // 1 at their median price, fading to 0 at 2×/0×
    }
    // True note matching: this SKU's flavor_tags vs the notes they actually log.
    let n = 0;
    const matchedNotes: string[] = [];
    for (const tag of c.flavor_tags ?? []) {
      const w = allNotes.get(tag.toLowerCase());
      if (w && w > 0) { n += Math.min(w, 2); matchedNotes.push(tag); }
    }
    const score = W_BRAND * b + W_COUNTRY * k + W_SIZE * s + W_PRICE * p + W_NOTES * Math.min(n, 3);
    if (score > 0.5) scored.push({ c, score, parts: { brand: b, country: k, size: s, price: p, notes: matchedNotes } });
  }

  scored.sort((a, b) => b.score - a.score);

  // ── Diversify + explain ──────────────────────────────────────────────────
  const picks: FlavorPick[] = [];
  const perBrand = new Map<string, number>();
  let lastBrand = '';

  for (const { c, score, parts } of scored) {
    const bKey = (c.brand ?? '').toLowerCase();
    if ((perBrand.get(bKey) ?? 0) >= 2) continue;
    if (bKey === lastBrand && picks.length > 0) continue; // no back-to-back same brand

    picks.push({
      slug: c.slug,
      brand: c.brand,
      name: c.name,
      country: c.country ?? null,
      size: c.size,
      price: typeof c.price === 'number' ? c.price : null,
      image_url: c.image_url ?? null,
      score: Math.round(score * 100) / 100,
      why: explain(c, parts, { anchorByBrand, anchorByCountry, notesByCountry, priceMid }),
    });
    perBrand.set(bKey, (perBrand.get(bKey) ?? 0) + 1);
    lastBrand = bKey;
    if (picks.length >= limit) break;
  }

  return picks;
}

function explain(
  c: CatalogCigar,
  parts: { brand: number; country: number; size: number; price: number; notes: string[] },
  ctx: {
    anchorByBrand: Map<string, { name: string; overall: number }>;
    anchorByCountry: Map<string, { name: string; overall: number }>;
    notesByCountry: Map<string, Map<string, number>>;
    priceMid: number | null;
  },
): string {
  const bits: string[] = [];
  const brandKey = c.brand?.toLowerCase() ?? '';
  const countryKey = c.country?.toLowerCase() ?? '';

  if (parts.notes.length > 0) {
    bits.push(`its ${parts.notes.slice(0, 2).join(' & ')} profile matches the notes you rate highest`);
  }
  if (parts.brand > 0) {
    const a = ctx.anchorByBrand.get(brandKey);
    bits.push(a
      ? `you rated ${a.name} ${'★'.repeat(Math.round(a.overall))}, and this is ${c.brand}'s ${c.size || 'companion'} expression`
      : `${c.brand} keeps showing up in your highest ratings`);
  }
  if (parts.country > 0 && c.country) {
    const notes = ctx.notesByCountry.get(countryKey);
    const top = notes ? [...notes.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([n]) => n) : [];
    bits.push(top.length
      ? `${c.country} tobacco lines up with the ${top.join(' & ')} notes you flag most`
      : `your top-rated smokes lean ${c.country}`);
  }
  if (parts.size > 0 && c.size) bits.push(`it's a ${c.size}, your go-to vitola`);
  if (parts.price > 0.5 && typeof c.price === 'number' && ctx.priceMid != null) {
    bits.push(`at $${c.price.toFixed(2)} it sits right in your usual range`);
  }

  if (bits.length === 0) return 'A close stylistic neighbor of your favorites.';
  const sentence = bits.slice(0, 2).join(', and ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}
