'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { geocodeAddress } from './geocode';
import { logEvent } from './audit';
import type { CatalogCigar } from '@/types';

/* ── DB-backed cigar search (so newly-approved cigars are instantly findable) ── */
export async function searchCatalogCigarsRemote(query: string, limit = 24): Promise<CatalogCigar[]> {
  const q = query.trim();
  if (!isSupabaseConfigured || q.length < 2) return [];
  try {
    const term = `%${q}%`;
    const { data, error } = await supabaseBrowser()
      .from('catalog_cigars')
      .select('id, brand, name, country, price, size, slug, image_url')
      .or(`name.ilike.${term},brand.ilike.${term}`)
      .limit(limit);
    if (error) {
      console.error('[db] cigar search failed:', error.message);
      return [];
    }
    return ((data ?? []) as Array<{ id: string; brand: string; name: string; country: string | null; price: number | null; size: string | null; slug: string; image_url: string | null }>).map((c) => ({
      uuid: c.id,
      brand: c.brand,
      name: c.name,
      country: c.country ?? '',
      price: c.price,
      size: c.size ?? '',
      slug: c.slug,
      image_url: c.image_url ?? null,
    }));
  } catch {
    return [];
  }
}

/** Resolve a cigar by slug from the DB (covers approvals not in the static JSON). */
export async function findCatalogCigarRemoteBySlug(slug: string): Promise<CatalogCigar | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabaseBrowser()
      .from('catalog_cigars')
      .select('id, brand, name, country, price, size, slug, image_url')
      .eq('slug', slug)
      .single();
    if (!data) return null;
    return {
      uuid: data.id,
      brand: data.brand,
      name: data.name,
      country: data.country ?? '',
      price: data.price,
      size: data.size ?? '',
      slug: data.slug,
      image_url: data.image_url ?? null,
    };
  } catch {
    return null;
  }
}

/* ── Recently added ──────────────────────────────────────────────────────── */
export interface RecentCigar {
  uuid: string;
  brand: string;
  name: string;
  size: string;
  slug: string;
  image_url?: string | null;
}
export interface RecentMember {
  handle: string;
  displayName: string;
  avatarUrl?: string;
  accountType: 'consumer' | 'retailer';
}
export interface RecentLounge {
  slug: string;
  name: string;
  city: string;
  state: string;
  certified?: boolean;
  image_url?: string | null;
}

export async function recentCigars(limit = 8): Promise<RecentCigar[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('catalog_cigars')
      .select('id, brand, name, size, slug, image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return ((data ?? []) as SbRow[]).map((c) => ({
      uuid: c.id, brand: c.brand, name: c.name, size: c.size ?? '', slug: c.slug, image_url: c.image_url ?? null,
    }));
  } catch {
    return [];
  }
}

export async function recentMembers(limit = 8): Promise<RecentMember[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('profiles')
      .select('handle, display_name, avatar_url, account_type, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return ((data ?? []) as SbRow[]).map((p) => ({
      handle: p.handle,
      displayName: p.display_name ?? p.handle,
      avatarUrl: p.avatar_url ?? undefined,
      accountType: (p.account_type === 'consumer' ? 'consumer' : 'retailer'),
    }));
  } catch {
    return [];
  }
}

export async function recentLounges(limit = 8): Promise<RecentLounge[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('lounges')
      .select('slug, name, city, state, certified, image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return ((data ?? []) as SbRow[]).map((l) => ({
      slug: l.slug, name: l.name, city: l.city ?? '', state: l.state ?? '', certified: l.certified ?? false, image_url: l.image_url ?? null,
    }));
  } catch {
    return [];
  }
}

export async function certifyLounge(slug: string, certified: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const sb = supabaseBrowser();
    const { data: l } = await sb.from('lounges').select('id, name').eq('slug', slug).single();
    const { error } = await sb.from('lounges').update({ certified, verified: certified }).eq('slug', slug);
    if (error) {
      console.error('[db] certify failed:', error.message);
      return false;
    }
    logEvent({
      action: certified ? 'lounge.certified' : 'lounge.uncertified',
      entityType: 'lounge',
      entityId: l?.id ?? slug,
      entityName: l?.name ?? slug,
      loungeId: l?.id ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/* ── Backfill: geocode lounges that are missing coordinates ─────────────── */
export async function geocodeMissingLounges(
  max = 25
): Promise<{ fixed: number; failed: number; remaining: number }> {
  if (!isSupabaseConfigured) return { fixed: 0, failed: 0, remaining: 0 };
  const sb = supabaseBrowser();
  let fixed = 0;
  let failed = 0;
  try {
    const { data } = await sb
      .from('lounges')
      .select('slug, name, address, city, state')
      .is('lat', null)
      .limit(max);
    for (const l of data ?? []) {
      const c = await geocodeAddress({
        name: l.name,
        address: l.address ?? '',
        city: l.city ?? '',
        state: l.state ?? '',
      });
      if (c) {
        const { error } = await sb.from('lounges').update({ lat: c.lat, lng: c.lng }).eq('slug', l.slug);
        if (error) failed++;
        else fixed++;
      } else {
        failed++;
      }
    }
    const { count } = await sb
      .from('lounges')
      .select('slug', { count: 'exact', head: true })
      .is('lat', null);
    return { fixed, failed, remaining: count ?? 0 };
  } catch (e) {
    console.error('[db] geocode backfill failed:', e);
    return { fixed, failed, remaining: -1 };
  }
}

/* ── Super-admin: remove a cigar from the catalog ───────────────────────── */
export async function deleteCatalogCigar(slug: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabaseBrowser().from('catalog_cigars').delete().eq('slug', slug);
    if (error) {
      console.error('[db] delete cigar failed:', error.message);
      return false;
    }
    logEvent({ action: 'cigar.deleted', entityType: 'cigar', entityId: slug, entityName: slug });
    return true;
  } catch {
    return false;
  }
}

/* ── Rating leaderboards (from views) ───────────────────────────────────── */
export interface RatedCigar {
  slug: string;
  brand: string;
  name: string;
  size: string;
  image_url?: string | null;
  avgOverall: number;
  ratingsCount: number;
}

function mapRated(rows: Record<string, unknown>[]): RatedCigar[] {
  return rows.map((r) => ({
    slug: String(r.slug),
    brand: String(r.brand ?? ''),
    name: String(r.name ?? ''),
    size: String(r.size ?? ''),
    image_url: (r.image_url as string) ?? null,
    avgOverall: Number(r.avg_overall ?? 0),
    ratingsCount: Number(r.ratings_count ?? 0),
  }));
}

export async function topCigarsThisWeek(limit = 8): Promise<RatedCigar[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('cigar_rating_week')
      .select('slug, brand, name, size, image_url, avg_overall, ratings_count')
      .order('ratings_count', { ascending: false })
      .order('avg_overall', { ascending: false })
      .limit(limit);
    return mapRated(data ?? []);
  } catch {
    return [];
  }
}

export async function highestRatedCigars(limit = 8): Promise<RatedCigar[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('cigar_rating_stats')
      .select('slug, brand, name, size, image_url, avg_overall, ratings_count')
      .order('avg_overall', { ascending: false })
      .order('ratings_count', { ascending: false })
      .limit(limit);
    return mapRated(data ?? []);
  } catch {
    return [];
  }
}

/* ── Lounge profile picture (lounge owner + super admin) ────────────────── */
export async function uploadLoungeLogo(slug: string, dataUrl: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = supabaseBrowser();
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const path = `lounge/${slug}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, blob, { contentType: blob.type, upsert: true });
    if (upErr) {
      console.error('[db] lounge logo upload failed:', upErr.message);
      return null;
    }
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const { data: l } = await sb.from('lounges').select('id, name').eq('slug', slug).single();
    const { error } = await sb.from('lounges').update({ image_url: url }).eq('slug', slug);
    if (error) {
      console.error('[db] lounge logo save failed:', error.message);
      return null;
    }
    logEvent({
      action: 'lounge.logo_changed',
      entityType: 'lounge',
      entityId: l?.id ?? slug,
      entityName: l?.name ?? slug,
      loungeId: l?.id ?? null,
    });
    return url;
  } catch (e) {
    console.error('[db] lounge logo error:', e);
    return null;
  }
}

/** Super-admin: remove a member's public profile by handle. */
export async function deleteProfileByHandle(handle: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const sb = supabaseBrowser();
    const { data: p } = await sb.from('profiles').select('id, display_name').eq('handle', handle).single();
    const { error } = await sb.from('profiles').delete().eq('handle', handle);
    if (error) {
      console.error('[db] delete profile failed:', error.message);
      return false;
    }
    logEvent({ action: 'profile.removed', entityType: 'profile', entityId: p?.id ?? handle, entityName: p?.display_name ?? handle });
    return true;
  } catch {
    return false;
  }
}
