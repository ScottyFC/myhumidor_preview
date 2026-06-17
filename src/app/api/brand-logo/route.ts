import { NextResponse } from 'next/server';

/**
 * GET /api/brand-logo?brand=Padron[&domain=padron.com]
 * Resolves a brand logo image URL, trying sources in order:
 *   1. logo.dev — search the brand (server-side, secret key) → logo image
 *      (https://img.logo.dev/<domain>?token=<publishable key>). If a domain is
 *      passed we skip the search and use it directly.
 *   2. Google Custom Search image API (GOOGLE_CSE_KEY + GOOGLE_CSE_CX).
 *   3. null → the UI falls back to a branded monogram.
 * Cached in memory for the process lifetime.
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
  const domain = (searchParams.get('domain') ?? '').trim() || undefined;
  if (!brand && !domain) return NextResponse.json({ url: null });

  const key = `${brand.toLowerCase()}|${domain ?? ''}`;
  if (cache.has(key)) return NextResponse.json({ url: cache.get(key) });

  const url = (await fromLogoDev(brand, domain)) || (await fromGoogleCse(brand));
  cache.set(key, url ?? null);
  return NextResponse.json({ url: url ?? null, source: url ? (domain || LOGODEV_SECRET ? 'logo.dev' : 'cse') : null });
}
