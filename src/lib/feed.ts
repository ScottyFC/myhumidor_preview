'use client';

/**
 * The home feed. Supabase mode assembles it from real activity: recent ratings
 * by people you follow + recent/promoted lounge posts. Demo mode returns empty
 * (no fabricated posts). Lounge posts come online once lounges start posting
 * (Phase 5), so early on the feed is mostly followed-user ratings.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { getSession } from './auth';

export type FeedKind = 'rated' | 'deal' | 'new_arrival' | 'event';

export interface FeedPost {
  id: string;
  kind: FeedKind;
  isLounge: boolean;
  authorName: string;
  authorHandle: string;
  authorVerified?: boolean;
  when: string;
  promoted?: boolean;
  cigar?: { brand: string; line: string; slug: string };
  rating?: number;
  loungeSlug?: string;
  title?: string;
  body?: string;
}

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export async function fetchFeed(): Promise<FeedPost[]> {
  if (!isSupabaseConfigured) return [];
  const session = getSession();
  const sb = supabaseBrowser();
  const posts: FeedPost[] = [];

  try {
    // 1. Ratings from people you follow.
    if (session?.uuid) {
      const { data: follows } = await sb.from('follows').select('followee_id').eq('follower_id', session.uuid);
      const ids = (follows ?? []).map((f) => f.followee_id);
      if (ids.length) {
        const [{ data: ratings }, { data: profs }] = await Promise.all([
          sb
            .from('ratings')
            .select('id, user_id, brand, name, slug, overall, created_at')
            .in('user_id', ids)
            .order('created_at', { ascending: false })
            .limit(20),
          sb.from('profiles').select('id, handle, display_name').in('id', ids),
        ]);
        const who = new Map((profs ?? []).map((p) => [p.id, p]));
        for (const r of ratings ?? []) {
          const p = who.get(r.user_id);
          posts.push({
            id: `r_${r.id}`,
            kind: 'rated',
            isLounge: false,
            authorName: p?.display_name ?? 'Member',
            authorHandle: p?.handle ?? 'member',
            when: ago(r.created_at),
            cigar: { brand: r.brand ?? '', line: r.name ?? '', slug: r.slug ?? '' },
            rating: Number(r.overall),
          });
        }
      }
    }

    // 2. Recent / promoted lounge posts (public).
    const { data: lps } = await sb
      .from('lounge_posts')
      .select('id, lounge_id, kind, title, body, promoted, created_at')
      .order('promoted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);
    if (lps && lps.length) {
      const loungeIds = Array.from(new Set(lps.map((l) => l.lounge_id)));
      const { data: lounges } = await sb.from('lounges').select('id, name, slug, verified').in('id', loungeIds);
      const byId = new Map((lounges ?? []).map((l) => [l.id, l]));
      for (const lp of lps) {
        const l = byId.get(lp.lounge_id);
        posts.push({
          id: `lp_${lp.id}`,
          kind: (lp.kind as FeedKind) ?? 'deal',
          isLounge: true,
          authorName: l?.name ?? 'Lounge',
          authorHandle: l?.slug ?? 'lounge',
          authorVerified: l?.verified ?? false,
          loungeSlug: l?.slug,
          promoted: lp.promoted ?? false,
          when: ago(lp.created_at),
          title: lp.title,
          body: lp.body ?? undefined,
        });
      }
    }
  } catch (e) {
    console.error('[feed] build error:', e);
  }

  // Promoted lounge posts first, then newest overall.
  return posts;
}
