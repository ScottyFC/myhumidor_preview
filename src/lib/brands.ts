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
export interface MyBrand { id: string; slug: string; name: string; role: string; tier: BrandTier; mfaEnabled?: boolean; email?: string; }
export interface BrandSubscription { tier: BrandTier; status: string; seats: number; monthlyBoostQuota: number; boostsUsed: number; }
export interface BrandPost { id: string; kind: 'release' | 'promo' | 'announcement'; title: string; body?: string; imageUrl?: string; linkUrl?: string; releaseDate?: string; boosted: boolean; createdAt: string; }
export interface BrandSignupRow extends BrandSignupInput { id: string; status: string; createdAt: string; userId?: string; linkedBrandId?: string; }
export interface BrandDetail { logoUrl?: string; bannerUrl?: string; description?: string; website?: string; hq?: string; onboarding: { dismissed?: boolean; acked?: string[] }; }
export interface BrandState { brand: MyBrand; subscription: BrandSubscription | null; posts: BrandPost[]; detail: BrandDetail; productCount: number; }

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function csrfToken(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|; )mh_brand_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

async function postJSON(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() }, body: JSON.stringify(body) });
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
    return [{ id: j.brand.id, slug: j.brand.slug, name: j.brand.name, tier: j.brand.tier, role: 'owner', mfaEnabled: !!j.mfaEnabled, email: j.email }];
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
  try { const r = await fetch(`/api/brand/post?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'x-csrf-token': csrfToken() } }); return r.ok; } catch { return false; }
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

export interface MfaSetup { secret: string; uri: string; qr: string | null }
export async function mfaSetup(): Promise<{ ok: boolean; setup?: MfaSetup; error?: string }> {
  try {
    const r = await fetch('/api/brand/mfa/setup', { method: 'POST', headers: { 'x-csrf-token': csrfToken() } });
    const j = await r.json();
    return r.ok && j.ok ? { ok: true, setup: { secret: j.secret, uri: j.uri, qr: j.qr } } : { ok: false, error: j.error };
  } catch { return { ok: false, error: 'Network error.' }; }
}
export async function mfaEnable(code: string) { return postJSON('/api/brand/mfa/enable', { code }); }
export async function mfaDisable(code: string) { return postJSON('/api/brand/mfa/disable', { code }); }

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

// ── Brand: support tickets ─────────────────────────────────────────────────
export async function submitSupportTicket(subject: string, body: string) {
  return postJSON('/api/brand/support', { subject, body });
}

// ── Super-admin: billing, reviews, tickets ─────────────────────────────────
export interface ApprovedBrandRow { brandId: string; name: string; slug: string; tier: BrandTier; subStatus: string; paymentMethod: string | null; contractAmountCents: number | null; contactEmail: string | null; seats: number }
export interface ReviewReqRow { id: string; brandName: string; tier: BrandTier; email: string | null; cigarName: string; message: string | null; priority: boolean; status: string; createdAt: string }
export interface TicketRow { id: string; brandName: string; tier: BrandTier; email: string | null; subject: string; body: string; priority: boolean; status: string; createdAt: string }
export interface InvoiceRow { id: string; brandName: string; amountCents: number; description: string | null; period: string | null; status: string; dueDate: string | null; createdAt: string }

export async function listApprovedBrands(): Promise<ApprovedBrandRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await sb().from('brand_subscriptions').select('brand_id, tier, status, seats, payment_method, contract_amount_cents, brands(name, slug, contact_email)').order('created_at', { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => {
    const b = (r.brands ?? {}) as Record<string, unknown>;
    return { brandId: r.brand_id as string, name: (b.name as string) ?? '—', slug: (b.slug as string) ?? '', tier: r.tier as BrandTier,
      subStatus: r.status as string, paymentMethod: (r.payment_method as string) ?? null, contractAmountCents: (r.contract_amount_cents as number) ?? null,
      contactEmail: (b.contact_email as string) ?? null, seats: (r.seats as number) ?? 0 };
  });
}
export async function setSubscriptionStatus(brandId: string, status: string, amountCents?: number): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await sb().rpc('set_brand_subscription_status', { p_brand_id: brandId, p_status: status, p_amount_cents: amountCents ?? null });
  return !error;
}
export async function setPaymentMethod(brandId: string, method: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await sb().rpc('set_brand_payment_method', { p_brand_id: brandId, p_method: method });
  return !error;
}
export async function createInvoice(p: { brandId: string; amountCents: number; description?: string; period?: string; dueDate?: string; send: boolean }): Promise<{ ok: boolean; emailed?: boolean; error?: string }> {
  try {
    const r = await fetch('/api/admin/invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    const j = await r.json(); return r.ok && j.ok ? { ok: true, emailed: j.emailed } : { ok: false, error: j.error };
  } catch { return { ok: false, error: 'Network error.' }; }
}
export async function listInvoices(): Promise<InvoiceRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await sb().from('brand_invoices').select('id, amount_cents, description, period, status, due_date, created_at, brands(name)').order('created_at', { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => ({ id: r.id as string, brandName: (((r.brands ?? {}) as Record<string, unknown>).name as string) ?? '—',
    amountCents: r.amount_cents as number, description: (r.description as string) ?? null, period: (r.period as string) ?? null,
    status: r.status as string, dueDate: (r.due_date as string) ?? null, createdAt: r.created_at as string }));
}
export async function listReviewRequests(): Promise<ReviewReqRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await sb().from('brand_review_requests').select('id, cigar_name, message, priority, status, email, created_at, brands(name, tier)').order('priority', { ascending: false }).order('created_at', { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => { const b = (r.brands ?? {}) as Record<string, unknown>;
    return { id: r.id as string, brandName: (b.name as string) ?? '—', tier: (b.tier as BrandTier) ?? 'standard', email: (r.email as string) ?? null,
      cigarName: r.cigar_name as string, message: (r.message as string) ?? null, priority: !!r.priority, status: r.status as string, createdAt: r.created_at as string }; });
}
export async function updateReviewStatus(id: string, status: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await sb().from('brand_review_requests').update({ status }).eq('id', id); return !error;
}
export async function listSupportTickets(): Promise<TicketRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await sb().from('support_tickets').select('id, subject, body, priority, status, email, created_at, brands(name, tier)').order('priority', { ascending: false }).order('created_at', { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => { const b = (r.brands ?? {}) as Record<string, unknown>;
    return { id: r.id as string, brandName: (b.name as string) ?? '—', tier: (b.tier as BrandTier) ?? 'standard', email: (r.email as string) ?? null,
      subject: r.subject as string, body: r.body as string, priority: !!r.priority, status: r.status as string, createdAt: r.created_at as string }; });
}
export async function updateTicketStatus(id: string, status: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await sb().from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id); return !error;
}

export async function changeBrandPassword(current: string, next: string) {
  return postJSON('/api/brand/password', { current, next });
}
