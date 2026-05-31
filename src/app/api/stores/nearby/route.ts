import { NextResponse } from 'next/server';
import { nearestStores } from '@/lib/catalog';

/**
 * GET /api/stores/nearby?lat=27.95&lng=-82.46&limit=20
 * Returns the closest stores to a point, with distance in miles.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 50);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }
  return NextResponse.json({ items: nearestStores(lat, lng, limit) });
}
