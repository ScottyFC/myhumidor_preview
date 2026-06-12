import { NextResponse } from 'next/server';
import { recommend, type FlavorHistory } from '@/lib/flavor-engine';

/**
 * POST /api/recommendations
 * Flavor Profiling: rating-weighted brand/country/vitola/price affinity over the
 * full catalog, returning the top picks with a user-facing `why` for each.
 *
 * Body (preferred):
 *   { ratings: [{ slug, overall, tastingNotes? }], ownedSlugs: [] }
 * Body (legacy, still accepted):
 *   { likedSlugs: [], ownedSlugs: [] }   — treated as 4★ ratings
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<FlavorHistory> & { likedSlugs?: string[] };
    const history: FlavorHistory = {
      ratings:
        body.ratings && body.ratings.length > 0
          ? body.ratings
          : (body.likedSlugs ?? []).map((slug) => ({ slug, overall: 4 })),
      ownedSlugs: body.ownedSlugs ?? [],
    };
    const items = recommend(history, 5);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
