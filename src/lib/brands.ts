import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Admin functions talk to the brand_* tables through an untyped view of the authed
// (super-admin) browser client. Brand-OPERATOR functions go through cookie-authed
// /api/brand/* routes instead, because brand operators are NOT Supabase users.
function sb(): SupabaseClient {
  return supabaseBrowser() as unknown as SupabaseClient;
}

export type BrandTier = 'standard' | 'premium';

export interface BrandSignupInput {
  contactName: string; company: string; businessAddress?: string; email: string;
  website?: string; phone?: string; taxId?: string; tier: BrandTier; notes?: string;
}
export interface MyBrand { id: string; slug: string; name: string; role: string; tier: BrandTier; }
export interface BrandSubscription { tier: BrandTier; status: string; seats: number; monthlyBoostQuota: number; boostsUsed: number; }
export interface BrandPost { id: string; kind: 'release' | 'promo' | 'announcement'; title: string; body?: string; imageUrl?: string; linkUrl?: string; releaseDate?: string; boosted: boolean; createdAt: string; }
export interface BrandSignupRow extends BrandSignupInput { id: string; status: string; createdAt: string; userId?: string; linkedBrandId?: string; }
export interface BrandDetail { logoUrl?: string; bannerUrl?: string; description?: string; website?: string; hq?: string; onboarding: { dismissed?: boolean; acked?: string[] }; }
export interface BrandState { brand: MyBrand; subscription: BrandSubscription | null; posts: BrandPost[]; detail: BrandDetail; productCount: number; }

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function postJSON(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j.ok !== false, error: j.error };
  } catch { return { ok: false, error: 'Network error.' }; }
}

// ── Brand operator (brand-auth portal session via cookie) ──────────────────
/** The brand the current portal session manages (empty if not logged in). */
export async function getMyBrands(): Promise<MyBrand[]> {
  try {
    const r = await fetch('/api/brand-auth/session');
    const j = await r.json();
    if (!j.brand) return [];
    return [{ id: j.brand.id, slug: j.brand.slug, name: j.brand.name, tier: j.brand.tier, role: 'owner' }];
  } catch { return []; }
}

/** Everything the dashboard needs in one call (subscription, posts, detail, products). */
export async function brandState(): Promise<BrandState | null> {
  try { const r = await fetch('/api/brand/state'); if (!r.ok) return null; return await r.json(); } catch { return null; }
}

export async function createBrandPost(_brandId: string, post: Omit<BrandPost, 'id' | 'createdAt' | 'boosted'> & { boosted?: boolean }) {
  return postJSON('/api/brand/post', post);
}
export async function deleteBrandPost(id: string): Promise<boolean> {
  try { const r = await fetch(`/api/brand/post?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); return r.ok; } catch { return false; }
}
export async function useBoost(_brandId: string): Promise<boolean> {
  return (await postJSON('/api/brand/boost', {})).ok;
}
export async function submitReviewRequest(_brandId: string, r: { cigarName: string; cigarSlug?: string; message?: string; priority?: boolean }) {
  return postJSON('/api/brand/review', r);
}
export async function updateBrandDetails(_brandId: string, patch: { logoUrl?: string | null; bannerUrl?: string | null; description?: string | null; website?: string | null; hq?: string | null }) {
  return postJSON('/api/brand/details', patch);
}
export async function setBrandOnboarding(_brandId: string, onboarding: BrandDetail['onboarding']): Promise<boolean> {
  return (await postJSON('/api/brand/onboarding', { onboarding })).ok;
}

export async function brandLogout(): Promise<void> {
  try { await fetch('/api/brand-auth/logout', { method: 'POST' }); } catch { /* ignore */ }
}

// ── Super-admin (Supabase session) ─────────────────────────────────────────
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
export async function adminLinkBrandOwner(brandId: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not configured' };
  const { error } = await sb().rpc('admin_link_brand_owner', { p_brand_id: brandId, p_user_id: userId.trim() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export { slugify as brandSlugify };
