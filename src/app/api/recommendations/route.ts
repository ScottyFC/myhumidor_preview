import { NextResponse } from 'next/server';
import { allCigars, findCatalogCigarBySlug } from '@/lib/catalog';

// Heuristic flavor-profile recommender: from the cigars a user liked, suggest
// catalog cigars that share a brand or country, excluding what they already own.
export async function POST(req: Request) {
  try {
    const { likedSlugs = [], ownedSlugs = [] } = (await req.json()) as {
      likedSlugs?: string[];
      ownedSlugs?: string[];
    };
    if (likedSlugs.length === 0) return NextResponse.json({ items: [] });

    const liked = likedSlugs.map((s) => findCatalogCigarBySlug(s)).filter(Boolean) as ReturnType<typeof findCatalogCigarBySlug>[];
    const brands = new Set(liked.map((c) => c!.brand?.toLowerCase()).filter(Boolean));
    const countries = new Set(liked.map((c) => c!.country?.toLowerCase()).filter(Boolean));
    const exclude = new Set([...likedSlugs, ...ownedSlugs]);

    const scored = allCigars()
      .filter((c) => c.image_url && !exclude.has(c.slug))
      .map((c) => {
        let score = 0;
        if (brands.has(c.brand?.toLowerCase())) score += 2;
        if (countries.has(c.country?.toLowerCase())) score += 1;
        return { c, score };
      })
      .filter((x) => x.score > 0);

    // Dedupe by brand so we don't return five of the same line.
    scored.sort((a, b) => b.score - a.score);
    const seenBrand = new Set<string>();
    const items: unknown[] = [];
    for (const { c } of scored) {
      const key = (c.brand ?? '').toLowerCase();
      if (seenBrand.has(key)) continue;
      seenBrand.add(key);
      items.push({ slug: c.slug, name: c.name, brand: c.brand, country: c.country ?? null, size: c.size, price: c.price ?? null, image_url: c.image_url });
      if (items.length >= 5) break;
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
