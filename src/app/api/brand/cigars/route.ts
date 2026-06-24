import { NextResponse } from 'next/server';
import { getBrandSession } from '@/lib/brand-auth';
import { cigarsByBrand, brandSlug } from '@/lib/catalog';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const slug = s.brand.slug;
  const { cigars } = cigarsByBrand(slug);
  const out = new Map<string, { slug: string; name: string; size: string; country: string; price: number | null }>();
  for (const c of cigars) out.set(c.slug, { slug: c.slug, name: c.name, size: c.size ?? '', country: c.country ?? '', price: c.price ?? null });

  const sb = supabaseService() as unknown as SupabaseClient | null;
  if (sb) {
    try {
      const { data } = await sb.from('catalog_cigars').select('id, brand, name, country, price, size, slug').or(`slug.eq.${slug},slug.ilike.${slug}-%`).limit(500);
      for (const r of (data ?? []) as Record<string, unknown>[]) {
        if (brandSlug(r.brand as string) !== slug) continue;
        const cs = r.slug as string;
        if (!out.has(cs)) out.set(cs, { slug: cs, name: r.name as string, size: (r.size as string) ?? '', country: (r.country as string) ?? '', price: (r.price as number) ?? null });
      }
    } catch { /* ignore */ }
  }
  return NextResponse.json({ ok: true, cigars: [...out.values()].sort((a, b) => a.name.localeCompare(b.name)) });
}
