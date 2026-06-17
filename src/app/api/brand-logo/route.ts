import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

/**
 * GET /api/brand-logo?brand=Padron[&slug=padron-1964][&domain=padron.com]
 * Resolves an image following the hierarchy product → brand → fallback:
 *   1. product — catalog_cigars.image_url by slug (the cigar's own photo);
 *   2. brand   — brand_images by brand;
 *   3. logo.dev (search → logo image), then Google CSE;
 *   4. null → UI falls back to a monogram.
 * DB layers are read live (so admin uploads reflect on refresh); only the
 * external logo.dev/CSE results are cached.
 */
const cache = new Map<string, string | null>();

const LOGODEV_SECRET = process.env.LOGODEV_SECRET_KEY;
const LOGODEV_PK = process.env.LOGODEV_PUBLISHABLE_KEY;

function logoImageUrl(domain: string): string | null {
  if (!LOGODEV_PK || !domain) return null;
  const d = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return `https://img.logo.dev/${encodeURIComponent(d)}?token=${LOGODEV_PK}&size=240&format=png&retina=true`;
}

async function fromLogoDev(brand: string, domain?: string): Promise<string | null> {
  // Direct domain → no search needed.
  if (domain) return logoImageUrl(domain);
  if (!LOGODEV_SECRET || !LOGODEV_PK) return null;
  try {
    const res = await fetch(`https://api.logo.dev/search?q=${encodeURIComponent(brand)}`, {
      headers: { Authorization: `Bearer ${LOGODEV_SECRET}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ name?: string; domain?: string }>;
    const best = Array.isArray(data) ? data[0] : null;
    return best?.domain ? logoImageUrl(best.domain) : null;
  } catch {
    return null;
  }
}

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
  const domain = (searchParams.get('domain') ?? '').trim() || undefined;
  if (!brand && !slug && !domain) return NextResponse.json({ url: null });

  // 1) Product + 2) Brand — live DB reads (not cached, so admin edits show up).
  if (isSupabaseConfigured && (slug || brand)) {
    try {
      const sb = await supabaseServer();
      if (slug) {
        const { data } = await sb.from('catalog_cigars').select('image_url').eq('slug', slug).maybeSingle();
        const u = (data as { image_url?: string } | null)?.image_url;
        if (u) return NextResponse.json({ url: u, source: 'product' });
      }
      if (brand) {
        const { data } = await sb.from('brand_images').select('image_url').eq('brand', brand).maybeSingle();
        const u = (data as { image_url?: string } | null)?.image_url;
        if (u) return NextResponse.json({ url: u, source: 'brand' });
      }
    } catch { /* fall through to external sources */ }
  }

  // 3) External (cached).
  const key = `${brand.toLowerCase()}|${domain ?? ''}`;
  if (cache.has(key)) return NextResponse.json({ url: cache.get(key), source: 'cache' });

  const url = (await fromLogoDev(brand, domain)) || (await fromGoogleCse(brand));
  cache.set(key, url ?? null);
  return NextResponse.json({ url: url ?? null, source: url ? 'logo.dev' : null });
}
