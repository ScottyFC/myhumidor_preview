import { NextResponse } from 'next/server';
import { getBrandSession, svc } from '@/lib/brand-auth';
import { cigarsByBrand, brandSlug } from '@/lib/catalog';

export const runtime = 'nodejs';

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = svc();
  if (!sb) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const [{ data: sub }, { data: posts }, { data: brand }] = await Promise.all([
    sb.from('brand_subscriptions').select('*').eq('brand_id', s.brandId).maybeSingle(),
    sb.from('brand_posts').select('*').eq('brand_id', s.brandId).order('created_at', { ascending: false }),
    sb.from('brands').select('logo_url, banner_url, description, website, hq, onboarding').eq('id', s.brandId).maybeSingle(),
  ]);

  const seen = new Set<string>();
  try { for (const c of cigarsByBrand(s.brand.slug).cigars) seen.add(c.slug); } catch { /* ignore */ }
  try {
    const { data: cc } = await sb.from('catalog_cigars').select('slug, brand').or(`slug.eq.${s.brand.slug},slug.ilike.${s.brand.slug}-%`).limit(500);
    for (const r of cc ?? []) { if (brandSlug((r as { brand: string }).brand) === s.brand.slug) seen.add((r as { slug: string }).slug); }
  } catch { /* ignore */ }

  const su = sub as Record<string, unknown> | null;
  const br = brand as Record<string, unknown> | null;
  return NextResponse.json({
    brand: s.brand,
    subscription: su ? { tier: su.tier, status: su.status, seats: su.seats, monthlyBoostQuota: su.monthly_boost_quota, boostsUsed: su.boosts_used } : null,
    posts: (posts ?? []).map((p: Record<string, unknown>) => ({
      id: p.id, kind: p.kind, title: p.title, body: p.body ?? undefined, imageUrl: p.image_url ?? undefined,
      linkUrl: p.link_url ?? undefined, releaseDate: p.release_date ?? undefined, boosted: !!p.boosted, createdAt: p.created_at,
    })),
    detail: { logoUrl: br?.logo_url ?? undefined, bannerUrl: br?.banner_url ?? undefined, description: br?.description ?? undefined, website: br?.website ?? undefined, hq: br?.hq ?? undefined, onboarding: br?.onboarding ?? {} },
    productCount: seen.size,
  });
}
