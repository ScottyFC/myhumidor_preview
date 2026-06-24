import { NextResponse } from 'next/server';
import { getBrandSession, svc } from '@/lib/brand-auth';
import { cigarsByBrand } from '@/lib/catalog';

export const runtime = 'nodejs';

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc(); if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const brandName = s.brand.name;

  // Followers (+ profile handles).
  const { data: fRows, count: followerCount } = await sb.from('brand_follows').select('user_id, created_at', { count: 'exact' }).eq('brand_id', s.brandId).order('created_at', { ascending: false }).limit(1000);
  const fIds = (fRows ?? []).map((r: { user_id: string }) => r.user_id);
  const profById = new Map<string, { handle: string; display_name: string }>();
  if (fIds.length) {
    const { data: profs } = await sb.from('profiles').select('id, handle, display_name').in('id', fIds.slice(0, 1000));
    for (const p of (profs ?? []) as Record<string, unknown>[]) profById.set(p.id as string, { handle: (p.handle as string) ?? '', display_name: (p.display_name as string) ?? '' });
  }
  const followers = (fRows ?? []).map((r: { user_id: string; created_at: string }) => ({ handle: profById.get(r.user_id)?.handle ?? '', displayName: profById.get(r.user_id)?.display_name ?? '', since: r.created_at }));

  // Recent ratings on this brand's cigars (ratings carry the brand name).
  const { data: rRows } = await sb.from('ratings').select('overall, name, notes, created_at, user_id, slug').eq('brand', brandName).order('created_at', { ascending: false }).limit(100);
  const rIds = [...new Set((rRows ?? []).map((r: { user_id: string }) => r.user_id))];
  if (rIds.length) { const { data: profs } = await sb.from('profiles').select('id, handle, display_name').in('id', rIds); for (const p of (profs ?? []) as Record<string, unknown>[]) if (!profById.has(p.id as string)) profById.set(p.id as string, { handle: (p.handle as string) ?? '', display_name: (p.display_name as string) ?? '' }); }
  const ratings = (rRows ?? []).map((r: Record<string, unknown>) => ({ cigar: (r.name as string) ?? '', overall: (r.overall as number) ?? null, notes: (r.notes as string) ?? '', when: r.created_at as string, handle: profById.get(r.user_id as string)?.handle ?? '' }));

  // Recent comments on this brand's cigars (match by the brand's cigar slugs).
  const slugs = new Set(cigarsByBrand(s.brand.slug).cigars.map((c) => c.slug));
  try { const { data: own } = await sb.from('catalog_cigars').select('slug').eq('brand_id', s.brandId).limit(500); for (const c of (own ?? []) as { slug: string }[]) slugs.add(c.slug); } catch { /* ignore */ }
  let comments: { cigar: string; body: string; when: string; handle: string }[] = [];
  if (slugs.size) {
    const { data: cRows } = await sb.from('comments').select('body, created_at, user_id, target_id').eq('target_type', 'cigar').in('target_id', [...slugs].slice(0, 300)).order('created_at', { ascending: false }).limit(100);
    const cIds = [...new Set((cRows ?? []).map((r: { user_id: string }) => r.user_id))];
    if (cIds.length) { const { data: profs } = await sb.from('profiles').select('id, handle').in('id', cIds); for (const p of (profs ?? []) as Record<string, unknown>[]) if (!profById.has(p.id as string)) profById.set(p.id as string, { handle: (p.handle as string) ?? '', display_name: '' }); }
    comments = (cRows ?? []).map((r: Record<string, unknown>) => ({ cigar: (r.target_id as string) ?? '', body: (r.body as string) ?? '', when: r.created_at as string, handle: profById.get(r.user_id as string)?.handle ?? '' }));
  }

  return NextResponse.json({ ok: true, followerCount: followerCount ?? followers.length, followers, ratings, comments });
}
