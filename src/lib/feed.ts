'use client';

/**
 * The home feed. Supabase mode assembles it from real activity: recent ratings
 * by people you follow + recent/promoted lounge posts. Demo mode returns empty
 * (no fabricated posts). Lounge posts come online once lounges start posting
 * (Phase 5), so early on the feed is mostly followed-user ratings.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { getSession } from './auth';

export type FeedKind = 'rated' | 'deal' | 'new_arrival' | 'event' | 'check_in';

export interface FeedPost {
  id: string;
  kind: FeedKind;
  isLounge: boolean;
  authorName: string;
  authorHandle: string;
  authorId?: string;
  authorVerified?: boolean;
  when: string;
  ts?: number;
  promoted?: boolean;
  cigar?: { brand: string; line: string; slug: string };
  rating?: number;
  loungeSlug?: string;
  loungeName?: string;
  title?: string;
  body?: string;
  photoUrl?: string;
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
            authorId: r.user_id,
            authorName: p?.display_name ?? 'Member',
            authorHandle: p?.handle ?? 'member',
            when: ago(r.created_at),
            ts: new Date(r.created_at).getTime(),
            cigar: { brand: r.brand ?? '', line: r.name ?? '', slug: r.slug ?? '' },
            rating: Number(r.overall),
          });
        }

        // Check-ins from people you follow.
        const { data: cis } = await sb
          .from('check_ins')
          .select('id, user_id, cigar_brand, cigar_name, cigar_slug, lounge_slug, lounge_name, rating, review, photo_url, created_at')
          .in('user_id', ids)
          .order('created_at', { ascending: false })
          .limit(20);
        for (const c of cis ?? []) {
          const p = who.get(c.user_id);
          posts.push({
            id: `c_${c.id}`,
            kind: 'check_in',
            isLounge: false,
            authorId: c.user_id,
            authorName: p?.display_name ?? 'Member',
            authorHandle: p?.handle ?? 'member',
            when: ago(c.created_at),
            ts: new Date(c.created_at).getTime(),
            cigar: { brand: c.cigar_brand ?? '', line: c.cigar_name ?? '', slug: c.cigar_slug ?? '' },
            rating: c.rating != null ? Number(c.rating) : undefined,
            loungeSlug: c.lounge_slug ?? undefined,
            loungeName: c.lounge_name ?? undefined,
            body: c.review ?? undefined,
            photoUrl: c.photo_url ?? undefined,
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
    const lpsRows = lps ?? [];
    if (lpsRows.length) {
      const loungeIds = Array.from(new Set(lpsRows.map((l) => l.lounge_id)));
      const { data: lounges } = await sb.from('lounges').select('id, name, slug, verified').in('id', loungeIds);
      const byId = new Map((lounges ?? []).map((l) => [l.id, l]));
      for (const lp of lpsRows) {
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
          ts: new Date(lp.created_at).getTime(),
          title: lp.title,
          body: lp.body ?? undefined,
        });
      }
    }
  } catch (e) {
    console.error('[feed] build error:', e);
  }

  // Promoted lounge posts first, then newest overall.
  return posts.sort((a, b) => {
    if (!!b.promoted !== !!a.promoted) return b.promoted ? 1 : -1;
    return (b.ts ?? 0) - (a.ts ?? 0);
  });
}
