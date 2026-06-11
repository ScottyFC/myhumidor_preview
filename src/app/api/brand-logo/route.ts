import { NextResponse } from 'next/server';

/**
 * GET /api/brand-logo?brand=Padron
 * Returns { url } for a brand logo image. Uses the Google Custom Search JSON API
 * when GOOGLE_CSE_KEY + GOOGLE_CSE_CX are configured (image search for
 * "<brand> cigar logo"); otherwise returns { url: null } and the UI falls back
 * to a branded monogram. Results are cached in memory for the process lifetime.
 */
const cache = new Map<string, string | null>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = (searchParams.get('brand') ?? '').trim();
  if (!brand) return NextResponse.json({ url: null });

  const key = brand.toLowerCase();
  if (cache.has(key)) return NextResponse.json({ url: cache.get(key) });

  const apiKey = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) {
    cache.set(key, null);
    return NextResponse.json({ url: null, configured: false });
  }

  try {
    const q = encodeURIComponent(`${brand} cigar logo`);
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}` +
      `&searchType=image&num=1&imgType=clipart&safe=active&q=${q}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) { cache.set(key, null); return NextResponse.json({ url: null }); }
    const data = await res.json();
    const link: string | null = data?.items?.[0]?.link ?? null;
    cache.set(key, link);
    return NextResponse.json({ url: link });
  } catch {
    cache.set(key, null);
    return NextResponse.json({ url: null });
  }
}
