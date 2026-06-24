import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf, notifyBrandFollowers } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc();
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const kind = ['release', 'promo', 'announcement'].includes(b.kind) ? b.kind : 'announcement';
  if (!b.title) return NextResponse.json({ ok: false, error: 'Title required.' }, { status: 400 });
  const { error } = await sb.from('brand_posts').insert({
    brand_id: s.brandId, kind, title: b.title, body: b.body ?? null, image_url: b.imageUrl ?? null,
    link_url: b.linkUrl ?? null, release_date: b.releaseDate ?? null, boosted: !!b.boosted,
  } as never);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await notifyBrandFollowers(s.brandId, s.brand.name, s.brand.slug, `${s.brand.name}: ${b.title}`, 'brand_post');
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc();
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });
  // Scope the delete to this brand so one brand can't delete another's posts.
  const { error } = await sb.from('brand_posts').delete().eq('id', id).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
