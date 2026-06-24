import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf } from '@/lib/brand-auth';
import { cigarsByBrand, brandSlug } from '@/lib/catalog';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type Status = 'available' | 'coming_soon' | 'discontinued';
const STATUSES: Status[] = ['available', 'coming_soon', 'discontinued'];
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const slug = s.brand.slug;
  const out = new Map<string, { slug: string; name: string; size: string; country: string; price: number | null; status: Status; id: string | null; owned: boolean }>();
  // Static catalog cigars (read-only — a brand can't delete catalog history).
  for (const c of cigarsByBrand(slug).cigars) out.set(c.slug, { slug: c.slug, name: c.name, size: c.size ?? '', country: c.country ?? '', price: c.price ?? null, status: 'available', id: null, owned: false });

  const sb = svc();
  if (sb) {
    try {
      const { data } = await sb.from('catalog_cigars').select('id, brand, brand_id, name, country, price, size, slug, status').or(`brand_id.eq.${s.brandId},slug.eq.${slug},slug.ilike.${slug}-%`).limit(500);
      for (const r of (data ?? []) as Record<string, unknown>[]) {
        const owned = r.brand_id === s.brandId;
        if (!owned && brandSlug(r.brand as string) !== slug) continue;
        out.set(r.slug as string, { slug: r.slug as string, name: r.name as string, size: (r.size as string) ?? '', country: (r.country as string) ?? '', price: (r.price as number) ?? null, status: (r.status as Status) ?? 'available', id: r.id as string, owned });
      }
    } catch { /* ignore */ }
  }
  return NextResponse.json({ ok: true, cigars: [...out.values()].sort((a, b) => a.name.localeCompare(b.name)) });
}

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc(); if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? '').trim();
  if (!name) return NextResponse.json({ ok: false, error: 'Cigar name is required.' }, { status: 400 });
  const status: Status = STATUSES.includes(b.status) ? b.status : 'available';
  const price = b.price === '' || b.price == null ? null : Number(b.price);

  // Slug must start with the brand slug so it groups onto the brand page; de-dupe if needed.
  let slug = `${s.brand.slug}-${slugify(name)}`.slice(0, 120);
  const { data: clash } = await sb.from('catalog_cigars').select('id').eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: row, error } = await sb.from('catalog_cigars').insert({
    brand: s.brand.name, brand_id: s.brandId, name, country: b.country || null,
    price: Number.isFinite(price as number) ? price : null, size: b.size || null, slug, status,
  } as never).select('id, name, size, country, price, slug, status').single();
  if (error || !row) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not add cigar.' }, { status: 500 });
  return NextResponse.json({ ok: true, cigar: row });
}

export async function PATCH(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc(); if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  const { error } = await sb.from('catalog_cigars').update({ status } as never).eq('id', id).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc(); if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id.' }, { status: 400 });
  const { error } = await sb.from('catalog_cigars').delete().eq('id', id).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
