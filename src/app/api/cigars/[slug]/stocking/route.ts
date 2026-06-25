import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

/**
 * GET /api/cigars/{slug}/stocking
 * Every lounge nationwide that lists this cigar in stock (no distance filter) —
 * for brand and lounge operators who want the full picture, not just nearby.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSupabaseConfigured) return NextResponse.json({ items: [] });
  try {
    const sb = await supabaseServer();
    const { data, error } = await sb
      .from('inventory_items')
      .select('price, in_stock, published, lounges!inner(slug, name, city, state, certified)')
      .eq('slug', slug)
      .eq('published', true);
    if (error) return NextResponse.json({ items: [] });
    type Row = { price: number | null; in_stock: boolean | null; lounges: { slug: string; name: string; city: string | null; state: string | null; certified: boolean | null } };
    const items = ((data ?? []) as unknown as Row[])
      .filter((r) => r.in_stock !== false && r.lounges)
      .map((r) => ({ slug: r.lounges.slug, name: r.lounges.name, city: r.lounges.city ?? '', state: r.lounges.state ?? '', price: r.price, certified: !!r.lounges.certified }))
      .sort((a, b) => (a.state || 'zz').localeCompare(b.state || 'zz') || a.name.localeCompare(b.name));
    return NextResponse.json({ items, count: items.length, states: new Set(items.map((i) => i.state).filter(Boolean)).size });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
