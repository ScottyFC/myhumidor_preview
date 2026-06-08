'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';

export interface AdSpot {
  id: string;
  advertiser: string;
  headline: string;
  subtext: string;
  qrUrl: string;
  imageUrl: string;
  lat: number | null;
  lng: number | null;
  radiusKm: number | null;
  startsAt: string | null;
  endsAt: string | null;
  weight: number;
  active: boolean;
}

const SELECT = 'id, advertiser, headline, subtext, qr_url, image_url, lat, lng, radius_km, starts_at, ends_at, weight, active, created_at';

function toSpot(r: Record<string, unknown>): AdSpot {
  return {
    id: r.id as string,
    advertiser: (r.advertiser as string) ?? '',
    headline: (r.headline as string) ?? '',
    subtext: (r.subtext as string) ?? '',
    qrUrl: (r.qr_url as string) ?? '',
    imageUrl: (r.image_url as string) ?? '',
    lat: (r.lat as number) ?? null,
    lng: (r.lng as number) ?? null,
    radiusKm: (r.radius_km as number) ?? null,
    startsAt: (r.starts_at as string) ?? null,
    endsAt: (r.ends_at as string) ?? null,
    weight: (r.weight as number) ?? 1,
    active: (r.active as boolean) ?? true,
  };
}

export async function listAdSpots(): Promise<AdSpot[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabaseBrowser().from('ad_spots').select(SELECT).order('created_at', { ascending: false });
  return (data ?? []).map(toSpot);
}

export interface NewAdSpot {
  advertiser?: string; headline: string; subtext?: string; qrUrl?: string; imageUrl?: string;
  lat?: number | null; lng?: number | null; radiusKm?: number | null;
  startsAt?: string | null; endsAt?: string | null; weight?: number;
}

export async function createAdSpot(input: NewAdSpot): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not connected.' };
  const { error } = await supabaseBrowser().from('ad_spots').insert({
    advertiser: input.advertiser || null,
    headline: input.headline,
    subtext: input.subtext || null,
    qr_url: input.qrUrl || null,
    image_url: input.imageUrl || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    radius_km: input.radiusKm ?? null,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    weight: input.weight ?? 1,
    active: true,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setAdActive(id: string, active: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabaseBrowser().from('ad_spots').update({ active }).eq('id', id);
  return !error;
}

export async function deleteAdSpot(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabaseBrowser().from('ad_spots').delete().eq('id', id);
  return !error;
}
