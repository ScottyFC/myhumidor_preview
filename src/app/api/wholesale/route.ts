import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

// Active box listings from Premier (premium-tier) brands only.
export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, brands: [] });
  try {
    const sb = (await supabaseServer()) as unknown as SupabaseClient;
    const { data } = await sb.from('brand_wholesale_listings')
      .select('id, cigar_name, vitola, cigars_per_box, price_per_box_cents, boxes_available, moq_boxes, image_url, brand_id, brands!inner(name, slug, tier, verified)')
      .eq('status', 'active').order('created_at', { ascending: false });
    type Row = { id: string; cigar_name: string; vitola: string | null; cigars_per_box: number; price_per_box_cents: number; boxes_available: number | null; moq_boxes: number; image_url: string | null; brand_id: string; brands: { name: string; slug: string; tier: string; verified: boolean } };
    const byBrand = new Map<string, { brandId: string; name: string; slug: string; listings: unknown[] }>();
    for (const r of ((data ?? []) as unknown as Row[])) {
      if (!r.brands || (r.brands.tier !== 'premium' && !r.brands.verified)) continue; // verified brands only
      const g = byBrand.get(r.brand_id) ?? { brandId: r.brand_id, name: r.brands.name, slug: r.brands.slug, listings: [] };
      g.listings.push({ id: r.id, cigarName: r.cigar_name, vitola: r.vitola, cigarsPerBox: r.cigars_per_box, pricePerBox: r.price_per_box_cents / 100, boxesAvailable: r.boxes_available, moqBoxes: r.moq_boxes, imageUrl: r.image_url });
      byBrand.set(r.brand_id, g);
    }
    return NextResponse.json({ ok: true, brands: Array.from(byBrand.values()) });
  } catch { return NextResponse.json({ ok: true, brands: [] }); }
}
