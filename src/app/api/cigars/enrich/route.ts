import { NextResponse } from 'next/server';
import { findCatalogCigarBySlug } from '@/lib/catalog';

// Given a list of slugs, return { slug: { price, country } } using the
// server-only catalog (price/country aren't carried on client collection rows).
export async function POST(req: Request) {
  try {
    const { slugs } = (await req.json()) as { slugs?: string[] };
    const out: Record<string, { price: number | null; country: string | null }> = {};
    for (const slug of (slugs ?? []).slice(0, 500)) {
      const c = findCatalogCigarBySlug(slug);
      if (c) out[slug] = { price: typeof c.price === 'number' ? c.price : null, country: c.country ?? null };
    }
    return NextResponse.json({ data: out });
  } catch {
    return NextResponse.json({ data: {} });
  }
}
