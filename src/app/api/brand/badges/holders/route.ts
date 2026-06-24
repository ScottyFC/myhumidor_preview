import { NextResponse } from 'next/server';
import { getBrandSession, svc } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (s.brand.tier !== 'premium') return NextResponse.json({ ok: false, error: 'Premium only.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const badgeId = new URL(req.url).searchParams.get('badgeId');
  if (!badgeId) return NextResponse.json({ ok: false, error: 'Missing badge.' }, { status: 400 });
  // Ownership check.
  const { data: badge } = await sb.from('badges').select('id, brand_id, name').eq('id', badgeId).maybeSingle();
  if (!badge || (badge as { brand_id: string }).brand_id !== s.brandId) return NextResponse.json({ ok: false, error: 'Not your badge.' }, { status: 403 });

  const { data: awards } = await sb.from('user_badges').select('user_id, earned_at').eq('badge_id', badgeId).order('earned_at', { ascending: false }).limit(5000);
  const ids = (awards ?? []).map((a: { user_id: string }) => a.user_id);
  const profById = new Map<string, { handle: string; display_name: string }>();
  if (ids.length) {
    const { data: profs } = await sb.from('profiles').select('id, handle, display_name').in('id', ids);
    for (const p of (profs ?? []) as Record<string, unknown>[]) profById.set(p.id as string, { handle: (p.handle as string) ?? '', display_name: (p.display_name as string) ?? '' });
  }
  const holders = (awards ?? []).map((a: { user_id: string; earned_at: string }) => ({ handle: profById.get(a.user_id)?.handle ?? '', displayName: profById.get(a.user_id)?.display_name ?? '', earnedAt: a.earned_at }));
  return NextResponse.json({ ok: true, badge: (badge as { name: string }).name, holders });
}
