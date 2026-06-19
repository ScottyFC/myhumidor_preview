/**
 * Forward geocoding via Mapbox — turns a lounge address into coordinates so
 * approved submissions can appear on the map and in nearby results.
 * Usable both client-side and in route handlers (the token is public).
 */

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  'pk.eyJ1Ijoic2plZmZlcnkiLCJhIjoiY21wcTMybnJkMGl6NDJxb2kwMHdveWc2eCJ9.7-_wuAUyICHe1qg5OOqAvg';

export interface AddressSuggestion {
  label: string; address: string; city: string; state: string; lat: number; lng: number;
}

/** Address autocomplete suggestions (Mapbox). Used by the verify form auto-fill. */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3 || !MAPBOX_TOKEN) return [];
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${MAPBOX_TOKEN}&autocomplete=true&country=us&limit=5&types=address,poi`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.features ?? []).map((f: Record<string, unknown>) => {
      const ctx = (f.context as Array<{ id: string; text: string; short_code?: string }>) ?? [];
      const place = ctx.find((c) => c.id?.startsWith('place'));
      const region = ctx.find((c) => c.id?.startsWith('region'));
      const num = f.address ? `${f.address} ` : '';
      const center = (f.center as [number, number]) ?? [0, 0];
      const stateCode = region?.short_code?.split('-')?.[1]?.toUpperCase() ?? region?.text ?? '';
      return {
        label: String(f.place_name ?? ''),
        address: `${num}${String(f.text ?? '')}`.trim(),
        city: place?.text ?? '',
        state: stateCode,
        lng: center[0], lat: center[1],
      } as AddressSuggestion;
    });
  } catch {
    return [];
  }
}

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

/** Geocode a free-text place — a city name or ZIP code — to coordinates.
 *  Used as a fallback when device location is unavailable. */
export async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q || !MAPBOX_TOKEN) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${MAPBOX_TOKEN}&limit=1&country=us&types=place,postcode,locality,region`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const center: [number, number] | undefined = data?.features?.[0]?.center;
    if (!center || center.length !== 2) return null;
    return { lng: center[0], lat: center[1] };
  } catch { return null; }
}
