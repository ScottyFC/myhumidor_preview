import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf, notifyBrandFollowers } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type Status = 'available' | 'coming_soon' | 'discontinued';
function normStatus(v: unknown): Status | null {
  const t = String(v ?? '').toLowerCase().replace(/\s+/g, '_');
  if (!t) return null;
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

  // Existing brand cigars: map by lower(name) for idempotent sync, plus slug set for de-dupe.
  const byName = new Map<string, string>(); // lower(name) -> id
  const takenSlugs = new Set<string>();
  try {
    const { data } = await sb.from('catalog_cigars').select('id, name, slug').or(`brand_id.eq.${s.brandId},slug.ilike.${s.brand.slug}-%`).limit(5000);
    for (const r of (data ?? []) as { id: string; name: string; slug: string }[]) {
      if (r.name) byName.set(r.name.trim().toLowerCase(), r.id);
      if (r.slug) takenSlugs.add(r.slug);
    }
  } catch { /* ignore */ }

  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const errors: string[] = [];
  const seen = new Set<string>(); // de-dupe within the CSV itself (last wins)

  rows.forEach((r, i) => {
    const name = String(r.name ?? '').trim();
    if (!name) { errors.push(`Row ${i + 1}: missing name`); return; }
    const key = name.toLowerCase();
    const price = r.price === '' || r.price == null ? undefined : Number(r.price);
    const status = normStatus(r.status);
    // Only set fields the CSV actually provided (don't wipe existing data with blanks).
    const fields: Record<string, unknown> = {};
    if (r.size) fields.size = String(r.size);
    if (r.country) fields.country = String(r.country);
    if (price !== undefined && Number.isFinite(price)) fields.price = price;
    if (r.imageUrl || r.image_url) fields.image_url = r.imageUrl || r.image_url;
    if (status) fields.status = status;

    const existingId = byName.get(key);
    if (existingId && !seen.has(key)) {
      updates.push({ id: existingId, patch: fields });
    } else if (!existingId && !seen.has(key)) {
      let slug = `${s.brand.slug}-${slugify(name)}`.slice(0, 120);
      while (takenSlugs.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      takenSlugs.add(slug);
      inserts.push({ brand: s.brand.name, brand_id: s.brandId, name, slug, status: status ?? 'available', ...fields });
    }
    seen.add(key);
  });

  let inserted = 0, updated = 0;
  for (let i = 0; i < inserts.length; i += 200) {
    const chunk = inserts.slice(i, i + 200);
    const { error, count } = await sb.from('catalog_cigars').insert(chunk as never, { count: 'exact' });
    if (error) errors.push(error.message); else inserted += count ?? chunk.length;
  }
  for (const u of updates) {
    if (Object.keys(u.patch).length === 0) continue; // nothing to change
    const { error } = await sb.from('catalog_cigars').update(u.patch as never).eq('id', u.id).eq('brand_id', s.brandId);
    if (error) errors.push(error.message); else updated++;
  }

  if (inserted > 0) await notifyBrandFollowers(s.brandId, s.brand.name, s.brand.slug, `${inserted} new cigars`, 'brand_inventory');
  return NextResponse.json({ ok: true, inserted, updated, errors });
}
