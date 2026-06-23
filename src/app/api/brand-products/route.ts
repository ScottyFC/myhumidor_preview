import { NextResponse } from 'next/server';
import { cigarsByBrand, brandSlug } from '@/lib/catalog';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

// Count products listed under a brand slug: static catalog + any DB-added cigars.
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  if (!slug) return NextResponse.json({ count: 0 });

  const seen = new Set<string>();
  try {
    const { cigars } = cigarsByBrand(slug);
    for (const c of cigars) seen.add(c.slug);
  } catch { /* ignore */ }

  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data } = await sb
        .from('catalog_cigars')
        .select('slug, brand')
        .or(`slug.eq.${slug},slug.ilike.${slug}-%`)
        .limit(500);
      for (const r of data ?? []) {
        if (brandSlug(r.brand as string) === slug) seen.add(r.slug as string);
      }
    } catch { /* ignore */ }
  }
  return NextResponse.json({ count: seen.size });
}
