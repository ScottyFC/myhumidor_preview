import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// The brand_* tables are newer than the generated Database type, so we talk to them
// through an untyped view of the authed browser client (keeps the user's session).
function sb(): SupabaseClient {
  return supabaseBrowser() as unknown as SupabaseClient;
}

export type BrandTier = 'standard' | 'premium';

export interface BrandSignupInput {
  contactName: string;
  company: string;
  businessAddress?: string;
  email: string;
  website?: string;
  phone?: string;
  taxId?: string;
  tier: BrandTier;
  notes?: string;
}

export interface MyBrand { id: string; slug: string; name: string; role: string; tier: BrandTier; }
export interface BrandSubscription { tier: BrandTier; status: string; seats: number; monthlyBoostQuota: number; boostsUsed: number; }
export interface BrandPost { id: string; kind: 'release' | 'promo' | 'announcement'; title: string; body?: string; imageUrl?: string; linkUrl?: string; releaseDate?: string; boosted: boolean; createdAt: string; }
export interface BrandSignupRow extends BrandSignupInput { id: string; status: string; createdAt: string; userId?: string; linkedBrandId?: string; }

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Submit a brand-account application (pending super-admin approval). */
export async function submitBrandSignup(input: BrandSignupInput): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not configured' };
  const { data: auth } = await sb().auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return { ok: false, error: 'Please sign in first.' };
  const { error } = await sb().from('brand_signup_requests').insert({
    user_id: uid,
    contact_name: input.contactName,
    company: input.company,
    business_address: input.businessAddress ?? null,
    email: input.email,
    website: input.website ?? null,
    phone: input.phone ?? null,
    tax_id: input.taxId ?? null,
    tier: input.tier,
    notes: input.notes ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Brands the current user manages (via brand_members). */
export async function getMyBrands(): Promise<MyBrand[]> {
  if (!isSupabaseConfigured) return [];
  const { data: auth } = await sb().auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];
  const { data } = await sb()
    .from('brand_members')
    .select('role, brands!inner(id, slug, name, tier)')
    .eq('user_id', uid);
  return (data ?? []).map((r: Record<string, unknown>) => {
    const b = r.brands as { id: string; slug: string; name: string; tier: BrandTier };
    return { id: b.id, slug: b.slug, name: b.name, tier: b.tier, role: r.role as string };
  });
}

export async function getBrandSubscription(brandId: string): Promise<BrandSubscription | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await sb().from('brand_subscriptions').select('*').eq('brand_id', brandId).maybeSingle();
  if (!data) return null;
  return { tier: data.tier, status: data.status, seats: data.seats, monthlyBoostQuota: data.monthly_boost_quota, boostsUsed: data.boosts_used };
}

export async function listBrandPosts(brandId: string): Promise<BrandPost[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await sb().from('brand_posts').select('*').eq('brand_id', brandId).order('created_at', { ascending: false });
  return (data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string, kind: p.kind as BrandPost['kind'], title: p.title as string, body: (p.body as string) ?? undefined,
    imageUrl: (p.image_url as string) ?? undefined, linkUrl: (p.link_url as string) ?? undefined,
    releaseDate: (p.release_date as string) ?? undefined, boosted: !!p.boosted, createdAt: p.created_at as string,
  }));
}

export async function createBrandPost(brandId: string, post: Omit<BrandPost, 'id' | 'createdAt' | 'boosted'> & { boosted?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not configured' };
  const { error } = await sb().from('brand_posts').insert({
    brand_id: brandId, kind: post.kind, title: post.title, body: post.body ?? null,
    image_url: post.imageUrl ?? null, link_url: post.linkUrl ?? null, release_date: post.releaseDate ?? null,
    boosted: post.boosted ?? false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteBrandPost(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await sb().from('brand_posts').delete().eq('id', id);
  return !error;
}

/** Spend one monthly boost; false if the quota is used up. */
export async function useBoost(brandId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await sb().rpc('brand_use_boost', { p_brand_id: brandId });
  return !error && data === true;
}

export async function submitReviewRequest(brandId: string, r: { cigarName: string; cigarSlug?: string; message?: string; priority?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not configured' };
  const { error } = await sb().from('brand_review_requests').insert({
    brand_id: brandId, cigar_name: r.cigarName, cigar_slug: r.cigarSlug ?? null, message: r.message ?? null, priority: r.priority ?? false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Super-admin: signup queue ──────────────────────────────────────────────
export async function listBrandSignups(status = 'pending'): Promise<BrandSignupRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await sb().from('brand_signup_requests').select('*').eq('status', status).order('created_at', { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, contactName: r.contact_name as string, company: r.company as string,
    businessAddress: (r.business_address as string) ?? undefined, email: r.email as string,
    website: (r.website as string) ?? undefined, phone: (r.phone as string) ?? undefined,
    taxId: (r.tax_id as string) ?? undefined, tier: r.tier as BrandTier, notes: (r.notes as string) ?? undefined,
    status: r.status as string, createdAt: r.created_at as string, userId: (r.user_id as string) ?? undefined,
  }));
}

/** Approve a signup → links an existing brand by slug or creates one, attaches the
 *  requester as owner, provisions the subscription. Returns the brand id. */
export async function approveBrandSignup(requestId: string, brandName: string, brandSlug?: string): Promise<{ ok: boolean; brandId?: string; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not configured' };
  const slug = (brandSlug && brandSlug.trim()) ? slugify(brandSlug) : slugify(brandName);
  const { data, error } = await sb().rpc('approve_brand_signup', { p_request_id: requestId, p_brand_name: brandName, p_brand_slug: slug });
  if (error) return { ok: false, error: error.message };
  return { ok: true, brandId: data as string };
}

export async function rejectBrandSignup(requestId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await sb().rpc('reject_brand_signup', { p_request_id: requestId });
  return !error;
}

export { slugify as brandSlugify };

// ── Brand page details + onboarding ────────────────────────────────────────
export interface BrandDetail {
  logoUrl?: string; bannerUrl?: string; description?: string; website?: string; hq?: string;
  onboarding: { dismissed?: boolean; acked?: string[] };
}

export async function getBrandDetail(brandId: string): Promise<BrandDetail | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await sb().from('brands').select('logo_url, banner_url, description, website, hq, onboarding').eq('id', brandId).maybeSingle();
  if (!data) return null;
  return {
    logoUrl: data.logo_url ?? undefined, bannerUrl: data.banner_url ?? undefined,
    description: data.description ?? undefined, website: data.website ?? undefined, hq: data.hq ?? undefined,
    onboarding: (data.onboarding as BrandDetail['onboarding']) ?? {},
  };
}

export async function updateBrandDetails(brandId: string, patch: { logoUrl?: string | null; bannerUrl?: string | null; description?: string | null; website?: string | null; hq?: string | null }): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not configured' };
  const row: Record<string, unknown> = {};
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  if (patch.bannerUrl !== undefined) row.banner_url = patch.bannerUrl;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.website !== undefined) row.website = patch.website;
  if (patch.hq !== undefined) row.hq = patch.hq;
  const { error } = await sb().from('brands').update(row).eq('id', brandId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setBrandOnboarding(brandId: string, onboarding: BrandDetail['onboarding']): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await sb().from('brands').update({ onboarding }).eq('id', brandId);
  return !error;
}

export async function brandProductCount(slug: string): Promise<number> {
  try {
    const res = await fetch(`/api/brand-products?slug=${encodeURIComponent(slug)}`);
    const j = await res.json();
    return typeof j.count === 'number' ? j.count : 0;
  } catch { return 0; }
}
