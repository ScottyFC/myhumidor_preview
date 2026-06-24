import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function quarterStart(): string { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), Math.floor(n.getUTCMonth() / 3) * 3, 1)).toISOString(); }

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await sb.from('badges').select('id, name, criteria, image_url, status, created_at').eq('brand_id', s.brandId).order('created_at', { ascending: false });
  const badges = await Promise.all(((data ?? []) as Record<string, unknown>[]).map(async (b) => {
    const { count } = await sb.from('user_badges').select('*', { count: 'exact', head: true }).eq('badge_id', b.id as string);
    return { id: b.id, title: b.name, trigger: b.criteria, imageUrl: b.image_url, status: b.status, holders: count ?? 0, createdAt: b.created_at };
  }));
  const premium = s.brand.tier === 'premium';
  const usedThisQuarter = ((data ?? []) as { created_at: string }[]).filter((b) => b.created_at >= quarterStart()).length;
  return NextResponse.json({ ok: true, badges, premium, usedThisQuarter, limit: premium ? null : 1 });
}

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const title = String(b.title ?? '').trim();
  const trigger = String(b.trigger ?? '').trim();
  if (!title) return NextResponse.json({ ok: false, error: 'Give the badge a title.' }, { status: 400 });
  if (!trigger) return NextResponse.json({ ok: false, error: 'Describe how members earn it (the trigger).' }, { status: 400 });

  // Quota: Standard = 1 per calendar quarter; Premium = unlimited.
  const premium = s.brand.tier === 'premium';
  if (!premium) {
    const { count } = await sb.from('badges').select('*', { count: 'exact', head: true }).eq('brand_id', s.brandId).gte('created_at', quarterStart());
    if ((count ?? 0) >= 1) return NextResponse.json({ ok: false, error: 'Standard plans can post one badge per quarter. Upgrade to Premium for unlimited badges.' }, { status: 403 });
  }

  let slug = `${s.brand.slug}-badge-${slugify(title)}`.slice(0, 120);
  const { data: clash } = await sb.from('badges').select('id').eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;

  const { data: row, error } = await sb.from('badges').insert({
    slug, name: title, criteria: trigger, tier: 'gold', image_url: b.imageUrl || null,
    brand_id: s.brandId, status: 'active', aficionado_only: false, needs_artwork: !b.imageUrl, billable: false,
  } as never).select('id').single();
  if (error || !row) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not create badge.' }, { status: 500 });
  return NextResponse.json({ ok: true, id: (row as { id: string }).id });
}

export async function DELETE(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id.' }, { status: 400 });
  const { error } = await sb.from('badges').delete().eq('id', id).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
