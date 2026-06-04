import 'server-only';
import { isSupabaseConfigured, supabaseServer } from './supabase';
import type { CatalogStore } from '@/types';

/**
 * Lounges with an active credit boost, newest boost first. Returned in the
 * CatalogStore shape so they can be prepended to the Featured Lounges carousel.
 */
export async function boostedLounges(limit = 6): Promise<CatalogStore[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = await supabaseServer();
    const { data, error } = await sb
      .from('lounges')
      .select('id, slug, name, city, state, address, lat, lng, image_url, verified, certified, boost_until')
      .gt('boost_until', new Date().toISOString())
      .order('boost_until', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      city: l.city ?? '',
      state: l.state ?? '',
      address: l.address ?? '',
      lat: l.lat ?? undefined,
      lng: l.lng ?? undefined,
      image_url: l.image_url ?? undefined,
      verified: l.verified ?? false,
      certified: l.certified ?? false,
    })) as unknown as CatalogStore[];
  } catch {
    return [];
  }
}
