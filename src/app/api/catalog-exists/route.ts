import { NextResponse } from 'next/server';
import { findCatalogCigarBySlug, cigarExistsByBrandName } from '@/lib/catalog';

/**
 * GET /api/catalog-exists?slug=…&brand=…&name=…
 * True if the cigar is already in the static catalog — by slug OR by a
 * normalized brand+name match (so a duplicate can't slip in under a slightly
 * different slug, which made cigars show twice).
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const slug = (p.get('slug') ?? '').trim();
  const brand = (p.get('brand') ?? '').trim();
  const name = (p.get('name') ?? '').trim();
  const exists = (!!slug && !!findCatalogCigarBySlug(slug)) || cigarExistsByBrandName(brand, name);
  return NextResponse.json({ exists, slug });
}
