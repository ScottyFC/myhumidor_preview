'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import type { CollectionItem } from './collection';
import type { UserRating } from './ratings';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'rare' | 'lounge';

export interface BadgeDef {
  id: string;
  slug: string;
  name: string;
  criteria?: string;   // human-readable requirement (doubles as the description)
  tier: BadgeTier;
  imageUrl?: string;
  loungeId?: string | null;
}

type Row = {
  id: string; slug: string; name: string; criteria: string | null;
  tier: string | null; image_url: string | null; lounge_id: string | null;
};
function rowTo(r: Row): BadgeDef {
  return {
    id: r.id, slug: r.slug, name: r.name, criteria: r.criteria ?? undefined,
    tier: (r.tier as BadgeTier) ?? 'bronze', imageUrl: r.image_url ?? undefined, loungeId: r.lounge_id,
  };
}
const SELECT = 'id, slug, name, criteria, tier, image_url, lounge_id';

export async function listBadges(): Promise<BadgeDef[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabaseBrowser().from('badges').select(SELECT);
    if (error) { console.error('[badges] list failed:', error.message); return []; }
    return (data ?? []).map((r) => rowTo(r as Row));
  } catch { return []; }
}

export async function listLoungeBadges(loungeId: string): Promise<BadgeDef[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const { data } = await supabaseBrowser().from('badges').select(SELECT).eq('lounge_id', loungeId);
    return (data ?? []).map((r) => rowTo(r as Row));
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
}

export function buildStats(humidor: CollectionItem[], ratings: UserRating[]): BadgeStats {
  const lc = (x?: string) => (x ?? '').toLowerCase();
  return {
    humidorCount: humidor.length,
    reviewCount: ratings.length,
    perfectCount: ratings.filter((r) => r.flavor === 5 && r.burn === 5 && r.appearance === 5).length,
    lowScoreCount: ratings.filter((r) => (r.flavor + r.burn + r.appearance) / 3 <= 2).length,
    rated: ratings.map((r) => ({ brand: lc(r.brand), slug: r.slug, size: lc(r.size) })),
    sizes: [...humidor, ...ratings].map((x) => lc(x.size)),
    reviewNotes: ratings.map((r) => `${lc(r.notes)} ${(r.tastingNotes ?? []).map(lc).join(' ')}`),
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

  let m = t.match(/rate\s+(\d+)\s+different cigars from\s+(.+)/) || t.match(/rate\s+(\d+)\s+different\s+(.+?)\s+cigars/);
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

export async function evaluateAndAward(userId: string, badges: BadgeDef[], stats: BadgeStats): Promise<number> {
  if (!isSupabaseConfigured || !userId) return 0;
  const already = await earnedBadgeIds(userId);
  const toAward = badges.filter((b) => {
    if (b.loungeId || already.has(b.id)) return false;
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

export async function createLoungeBadge(input: { loungeId: string; name: string; description?: string; imageUrl?: string }): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const slug = `lounge-${input.loungeId.slice(0, 8)}-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 60);
  try {
    const { error } = await supabaseBrowser().from('badges').insert({
      slug, name: input.name, criteria: input.description || 'Collectible badge from this lounge.',
      tier: 'rare', image_url: input.imageUrl || null, lounge_id: input.loungeId,
    });
    if (error) { console.error('[badges] create lounge badge failed:', error.message); return false; }
    return true;
  } catch { return false; }
}

export const TIER_RING: Record<string, string> = {
  bronze: 'from-amber-700/60 to-amber-900/20',
  silver: 'from-slate-300/60 to-slate-500/20',
  gold: 'from-amber-300/70 to-amber-600/20',
  rare: 'from-fuchsia-400/60 to-indigo-500/20',
  lounge: 'from-ember-300/60 to-leather/30',
};
