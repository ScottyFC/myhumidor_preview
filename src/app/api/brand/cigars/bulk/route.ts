import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf, notifyBrandFollowers } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type Status = 'available' | 'coming_soon' | 'discontinued';
function normStatus(v: unknown): Status {
  const t = String(v ?? '').toLowerCase().replace(/\s+/g, '_');
  return t === 'coming_soon' || t === 'comingsoon' ? 'coming_soon' : t === 'discontinued' ? 'discontinued' : 'available';
}
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const rows: Record<string, unknown>[] = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ ok: false, error: 'No rows to import.' }, { status: 400 });
  if (rows.length > 1000) return NextResponse.json({ ok: false, error: 'Max 1000 rows per import.' }, { status: 400 });

  // Existing slugs for this brand prefix, to de-dupe.
  const taken = new Set<string>();
  try {
    const { data } = await sb.from('catalog_cigars').select('slug').or(`brand_id.eq.${s.brandId},slug.ilike.${s.brand.slug}-%`).limit(2000);
    for (const r of (data ?? []) as { slug: string }[]) taken.add(r.slug);
  } catch { /* ignore */ }

  const toInsert: Record<string, unknown>[] = [];
  const errors: string[] = [];
  rows.forEach((r, i) => {
    const name = String(r.name ?? '').trim();
    if (!name) { errors.push(`Row ${i + 1}: missing name`); return; }
    let slug = `${s.brand.slug}-${slugify(name)}`.slice(0, 120);
    while (taken.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    taken.add(slug);
    const price = r.price === '' || r.price == null ? null : Number(r.price);
    toInsert.push({
      brand: s.brand.name, brand_id: s.brandId, name,
      country: r.country ? String(r.country) : null,
      size: r.size ? String(r.size) : null,
      price: Number.isFinite(price as number) ? price : null,
      image_url: r.imageUrl || r.image_url || null,
      status: normStatus(r.status), slug,
    });
  });
  if (!toInsert.length) return NextResponse.json({ ok: false, error: 'No valid rows.', errors }, { status: 400 });

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200);
    const { error, count } = await sb.from('catalog_cigars').insert(chunk as never, { count: 'exact' });
    if (error) { errors.push(error.message); } else { inserted += count ?? chunk.length; }
  }

  if (inserted > 0) await notifyBrandFollowers(s.brandId, s.brand.name, s.brand.slug, `${inserted} new cigars`, 'brand_inventory');
  return NextResponse.json({ ok: true, inserted, skipped: rows.length - inserted, errors });
}
