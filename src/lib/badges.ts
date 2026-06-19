'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import type { CollectionItem } from './collection';
import type { UserRating } from './ratings';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'rare' | 'lounge';

export interface BadgeDef {
  status?: string;
  needsArtwork?: boolean;
  billable?: boolean;
  id: string;
  slug: string;
  name: string;
  criteria?: string;   // human-readable requirement (doubles as the description)
  tier: BadgeTier;
  imageUrl?: string;
  loungeId?: string | null;
  aficionadoOnly?: boolean;
}

type Row = {
  id: string; slug: string; name: string; criteria: string | null;
  tier: string | null; image_url: string | null; lounge_id: string | null; aficionado_only: boolean | null; status?: string | null; needs_artwork?: boolean | null; billable?: boolean | null;
};
function rowTo(r: Row): BadgeDef {
  return {
    id: r.id, slug: r.slug, name: r.name, criteria: r.criteria ?? undefined,
    tier: (r.tier as BadgeTier) ?? 'bronze', imageUrl: r.image_url ?? undefined, loungeId: r.lounge_id, aficionadoOnly: r.aficionado_only ?? false, status: r.status ?? 'active', needsArtwork: !!r.needs_artwork, billable: !!r.billable,
  };
}
const SELECT = 'id, slug, name, criteria, tier, image_url, lounge_id, aficionado_only, status, needs_artwork, billable';

export async function listBadges(): Promise<BadgeDef[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabaseBrowser().from('badges').select(SELECT);
    if (error) { console.error('[badges] list failed:', error.message); return []; }
    return ((data ?? []) as Row[]).map((r) => rowTo(r));
  } catch { return []; }
}

export async function listLoungeBadges(loungeId: string): Promise<BadgeDef[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const { data } = await supabaseBrowser().from('badges').select(SELECT).eq('lounge_id', loungeId);
    return ((data ?? []) as Row[]).map((r) => rowTo(r));
  } catch { return []; }
}

export async function earnedBadgeIds(userId: string): Promise<Set<string>> {
  if (!isSupabaseConfigured || !userId) return new Set();
  try {
    const { data } = await supabaseBrowser().from('user_badges').select('badge_id').eq('user_id', userId);
    return new Set((data ?? []).map((r) => r.badge_id as string));
  } catch { return new Set(); }
}

/* ── Criteria evaluation ────────────────────────────────────────────────────
 * Criteria are free text. We parse the families computable from the user's
 * humidor + ratings; the rest (country/wrapper/price/dates/social) stay locked
 * until that data is tracked. Only recognized + met badges are auto-awarded. */
export interface BadgeStats {
  humidorCount: number;
  reviewCount: number;
  perfectCount: number;
  lowScoreCount: number;
  rated: { brand: string; slug: string; size: string }[];
  sizes: string[];
  reviewNotes: string[];
  prices: number[];        // prices of rated cigars (from enrichment)
  countries: string[];     // lowercased countries of rated cigars (from enrichment)
}

export type Enrichment = Record<string, { price: number | null; country: string | null }>;

export function buildStats(humidor: CollectionItem[], ratings: UserRating[], enrich: Enrichment = {}): BadgeStats {
  const lc = (x?: string) => (x ?? '').toLowerCase();
  const prices: number[] = [];
  const countries: string[] = [];
  for (const r of ratings) {
    const e = enrich[r.slug];
    if (e) {
      if (typeof e.price === 'number') prices.push(e.price);
      if (e.country) countries.push(e.country.toLowerCase());
    }
  }
  return {
    humidorCount: humidor.length,
    reviewCount: ratings.length,
    perfectCount: ratings.filter((r) => r.flavor === 5 && r.burn === 5 && r.appearance === 5).length,
    lowScoreCount: ratings.filter((r) => (r.flavor + r.burn + r.appearance) / 3 <= 2).length,
    rated: ratings.map((r) => ({ brand: lc(r.brand), slug: r.slug, size: lc(r.size) })),
    sizes: [...humidor, ...ratings].map((x) => lc(x.size)),
    reviewNotes: ratings.map((r) => `${lc(r.notes)} ${(r.tastingNotes ?? []).map(lc).join(' ')}`),
    prices,
    countries,
  };
}

function quoted(text: string): string[] {
  return [...text.matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase());
}

export function evaluateCriteria(criteria: string | undefined, s: BadgeStats): { recognized: boolean; met: boolean } {
  if (!criteria) return { recognized: false, met: false };
  const t = criteria.toLowerCase();
  const num = (re: RegExp, fb = 1) => { const m = t.match(re); return m ? parseInt(m[1], 10) : fb; };

  if (/rate your first cigar|first light/.test(t)) return { recognized: true, met: s.reviewCount >= 1 };

  if (/humidor|active cigars/.test(t) && /\d/.test(t)) {
    return { recognized: true, met: s.humidorCount >= num(/(\d+)/) };
  }

  if (/log\s+\d+\s+(total\s+)?(completed\s+)?(cigar\s+)?reviews?/.test(t) || /\d+\s+total completed cigar reviews/.test(t)) {
    const n = (t.match(/log\s+(\d+)/) ? num(/log\s+(\d+)/) : num(/(\d+)/));
    return { recognized: true, met: s.reviewCount >= n };
  }

  // Price: "Rate N cigars that cost over/under $M" (N optional → 1)
  let m = t.match(/(\d+)?\s*cigars?\s+that costs?\s+(over|under|more than|less than)\s*\$(\d+)/);
  if (!m) {
    const m2 = t.match(/costs?\s+(over|under|more than|less than)\s*\$(\d+)/);
    if (m2) {
      const over = /over|more/.test(m2[1]);
      const amt = parseInt(m2[2], 10);
      const count = s.prices.filter((p) => (over ? p > amt : p < amt)).length;
      return { recognized: true, met: count >= 1 };
    }
  } else {
    const n = m[1] ? parseInt(m[1], 10) : 1;
    const over = /over|more/.test(m[2]);
    const amt = parseInt(m[3], 10);
    const count = s.prices.filter((p) => (over ? p > amt : p < amt)).length;
    return { recognized: true, met: count >= n };
  }

  // Country / tobacco origin
  const COUNTRY: Record<string, string> = {
    nicaraguan: 'nicaragua', nicaragua: 'nicaragua', dominican: 'dominican',
    cuban: 'cuba', honduran: 'honduras', mexican: 'mexico', ecuadorian: 'ecuador',
  };
  m = t.match(/(\d+)?\s*(?:different\s+|authentic\s+)?cigars?\s+with\s+(\w+)\s+tobacco/)
    || t.match(/(\d+)?\s*(?:different\s+)?authentic\s+(\w+)\s+cigars?/)
    || t.match(/rate your first authentic\s+(\w+)\s+cigar/);
  if (m) {
    const firstish = /your first/.test(t);
    const word = (m[2] ?? m[1] ?? '').toLowerCase();
    const key = COUNTRY[word];
    if (key) {
      const n = firstish ? 1 : (m[1] && /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : 1);
      const count = s.countries.filter((c) => c.includes(key)).length;
      return { recognized: true, met: count >= n };
    }
  }

  m = t.match(/rate\s+(\d+)\s+different cigars from\s+(.+)/) || t.match(/rate\s+(\d+)\s+different\s+(.+?)\s+cigars/);
  if (m) {
    const n = parseInt(m[1], 10);
    const brand = m[2].trim().replace(/[.,]$/, '');
    const distinct = new Set(
      s.rated.filter((r) => r.brand && (r.brand.includes(brand) || brand.includes(r.brand))).map((r) => r.slug)
    ).size;
    return { recognized: true, met: distinct >= n };
  }

  m = t.match(/rate\s+(\d+)\s+(.+?)\s+vitolas?/);
  if (m) {
    const n = parseInt(m[1], 10);
    const vitola = m[2].trim();
    return { recognized: true, met: s.sizes.filter((sz) => sz.includes(vitola)).length >= n };
  }

  if ((t.includes('note in') || t.includes('tag ')) && quoted(t).length > 0) {
    const notes = quoted(t);
    const n = (t.match(/in\s+(\d+)/) ? num(/in\s+(\d+)/) : num(/(\d+)\s+reviews/));
    return { recognized: true, met: s.reviewNotes.filter((h) => notes.some((q) => h.includes(q))).length >= n };
  }

  if (/flawless|100 or 5\/5|perfect/.test(t)) return { recognized: true, met: s.perfectCount >= 1 };
  if (/under 60 points|2 stars|honest feedback/.test(t)) {
    return { recognized: true, met: s.lowScoreCount >= num(/(\d+)/, 5) };
  }

  return { recognized: false, met: false };
}

export async function evaluateAndAward(userId: string, badges: BadgeDef[], stats: BadgeStats, isMember = false): Promise<number> {
  if (!isSupabaseConfigured || !userId) return 0;
  const already = await earnedBadgeIds(userId);
  const toAward = badges.filter((b) => {
    if (b.loungeId || already.has(b.id)) return false;
    if (b.aficionadoOnly && !isMember) return false; // exclusive tier
    const r = evaluateCriteria(b.criteria, stats);
    return r.recognized && r.met;
  });
  if (toAward.length === 0) return 0;
  try {
    const { error } = await supabaseBrowser().from('user_badges').insert(toAward.map((b) => ({ user_id: userId, badge_id: b.id })));
    if (error) { console.error('[badges] award failed:', error.message); return 0; }
    return toAward.length;
  } catch { return 0; }
}

export async function collectBadge(userId: string, badgeId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;
  try {
    const { error } = await supabaseBrowser().from('user_badges').upsert(
      { user_id: userId, badge_id: badgeId }, { onConflict: 'user_id,badge_id' }
    );
    if (error) { console.error('[badges] collect failed:', error.message); return false; }
    return true;
  } catch { return false; }
}

export async function createLoungeBadge(input: { loungeSlug: string; name: string; imageUrl?: string | null; needsArtwork?: boolean }): Promise<{ ok: boolean; billable?: boolean; status?: string; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not connected.' };
  const { data, error } = await supabaseBrowser().rpc('create_lounge_badge', {
    p_slug: input.loungeSlug, p_name: input.name, p_image_url: input.imageUrl ?? null, p_needs_artwork: !!input.needsArtwork,
  });
  if (error) return { ok: false, error: error.message };
  const d = (data ?? {}) as { billable?: boolean; status?: string };
  return { ok: true, billable: d.billable, status: d.status };
}

/** Upload a transparent badge PNG; returns a public URL. */
export async function uploadBadgeImage(file: File): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = supabaseBrowser();
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `badges/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('submissions').upload(path, file, { contentType: file.type || 'image/png', upsert: true });
    if (error) { console.error('[badges] image upload failed:', error.message); return null; }
    return sb.storage.from('submissions').getPublicUrl(path).data.publicUrl;
  } catch { return null; }
}

/** Award a lounge's active collectible badges to a user (called on check-in). */
export async function awardLoungeBadgesOnCheckin(loungeId: string, userId: string): Promise<number> {
  if (!isSupabaseConfigured || !loungeId || !userId) return 0;
  try {
    const sb = supabaseBrowser();
    const { data } = await sb.from('badges').select('id, status').eq('lounge_id', loungeId).eq('status', 'active');
    let n = 0;
    for (const b of (data ?? []) as Array<{ id: string }>) {
      const ok = await collectBadge(userId, b.id);
      if (ok) n++;
    }
    return n;
  } catch { return 0; }
}

/** Admin: badges awaiting artwork. */
export async function listPendingBadgeArtwork(): Promise<Array<BadgeDef & { loungeName?: string }>> {
  if (!isSupabaseConfigured) return [];
  const sb = supabaseBrowser();
  const { data } = await sb.from('badges').select(SELECT + ', lounges(name)').eq('status', 'pending_artwork');
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({ ...rowTo(r), loungeName: r.lounges?.name }));
}

/** Admin: attach artwork + activate. */
export async function setBadgeArtwork(badgeId: string, imageUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabaseBrowser().rpc('admin_set_badge_artwork', { p_badge_id: badgeId, p_image_url: imageUrl });
  return !error;
}


export const TIER_RING: Record<string, string> = {
  bronze: 'from-amber-700/60 to-amber-900/20',
  silver: 'from-slate-300/60 to-slate-500/20',
  gold: 'from-amber-300/70 to-amber-600/20',
  rare: 'from-fuchsia-400/60 to-indigo-500/20',
  lounge: 'from-ember-300/60 to-leather/30',
};
