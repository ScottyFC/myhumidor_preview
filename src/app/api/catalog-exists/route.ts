import { NextResponse } from 'next/server';
import { findCatalogCigarBySlug } from '@/lib/catalog';

/**
 * GET /api/catalog-exists?slug=padron-1964
 * True if the slug is already in the static catalog. Used at submit time so a
 * cigar that already exists isn't pushed into catalog_cigars as a duplicate
 * (which made it show twice — once from static, once from the new DB row).
 */
export async function GET(request: Request) {
  const slug = (new URL(request.url).searchParams.get('slug') ?? '').trim();
  if (!slug) return NextResponse.json({ exists: false });
  const c = findCatalogCigarBySlug(slug);
  return NextResponse.json({ exists: !!c, slug });
}
