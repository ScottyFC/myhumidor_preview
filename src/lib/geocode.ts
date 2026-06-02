/**
 * Forward geocoding via Mapbox — turns a lounge address into coordinates so
 * approved submissions can appear on the map and in nearby results.
 * Usable both client-side and in route handlers (the token is public).
 */

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  'pk.eyJ1Ijoic2plZmZlcnkiLCJhIjoiY21wcTMybnJkMGl6NDJxb2kwMHdveWc2eCJ9.7-_wuAUyICHe1qg5OOqAvg';

export interface GeoParts {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
}

export async function geocodeAddress(parts: GeoParts): Promise<{ lat: number; lng: number } | null> {
  const query = [parts.address, parts.city, parts.state].filter(Boolean).join(', ').trim();
  if (!query || !MAPBOX_TOKEN) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${MAPBOX_TOKEN}&limit=1&country=us&types=address,poi`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[geocode] request failed:', res.status);
      return null;
    }
    const data = await res.json();
    const center: [number, number] | undefined = data?.features?.[0]?.center;
    if (!center || center.length !== 2) return null;
    return { lng: center[0], lat: center[1] };
  } catch (e) {
    console.error('[geocode] error:', e);
    return null;
  }
}
