import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';
import { findCatalogCigarBySlug } from '@/lib/catalog';

/**
 * GET /api/brand-logo?brand=Padron[&slug=padron-1964]
 * Resolves an image following the hierarchy product → brand → fallback:
 *   1. product — catalog_cigars.image_url by slug (the cigar's own photo);
 *   2. product-static — the static catalog image;
 *   3. brand   — brand_images by brand (admin uploads);
 *   4. Google CSE (optional), else null → UI falls back to a monogram.
 * DB layers are read live so admin uploads reflect on refresh.
 */
const cache = new Map<string, string | null>();

async function fromGoogleCse(brand: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) return null;
  try {
    const q = encodeURIComponent(`${brand} cigar logo`);
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}` +
      `&searchType=image&num=1&imgType=clipart&safe=active&q=${q}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.items?.[0]?.link ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = (searchParams.get('brand') ?? '').trim();
  const slug = (searchParams.get('slug') ?? '').trim();
  if (!brand && !slug) return NextResponse.json({ url: null });

  // 1) Product + 2) Brand — live DB reads (not cached, so admin edits show up).
  if (isSupabaseConfigured && (slug || brand)) {
    try {
      const sb = await supabaseServer();
      if (slug) {
        const { data } = await sb.from('catalog_cigars').select('image_url').eq('slug', slug).maybeSingle();
        const u = (data as { image_url?: string } | null)?.image_url;
        if (u) return NextResponse.json({ url: u, source: 'product' });
        const stat = findCatalogCigarBySlug(slug);
        if (stat?.image_url) return NextResponse.json({ url: stat.image_url, source: 'product-static' });
      }
      if (brand) {
        const { data } = await sb.from('brand_images').select('image_url').eq('brand', brand).maybeSingle();
        const u = (data as { image_url?: string } | null)?.image_url;
        if (u) return NextResponse.json({ url: u, source: 'brand' });
      }
    } catch { /* fall through */ }
  }

  // 3) Optional external (Google CSE), cached in-memory.
  const key = brand.toLowerCase();
  if (cache.has(key)) return NextResponse.json({ url: cache.get(key), source: 'cache' });
  const url = await fromGoogleCse(brand);
  cache.set(key, url ?? null);
  return NextResponse.json({ url: url ?? null, source: url ? 'cse' : null });
}
