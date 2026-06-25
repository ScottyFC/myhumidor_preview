'use client';
// Client API for the cigar broker: brand wholesale listings, orders, and the
// lounge<->brand messaging system. Brand mutations carry the brand CSRF token.

function csrf(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)mh_brand_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init); return r.json().catch(() => ({})) as Promise<T>;
}
const brandHeaders = () => ({ 'Content-Type': 'application/json', 'x-csrf-token': csrf() });

export interface WholesaleListing { id: string; cigar_name: string; vitola: string | null; cigars_per_box: number; price_per_box_cents: number; boxes_available: number; moq_boxes: number; status: string; image_url: string | null }
export interface BrokerOrder { id: string; status: string; total_cents: number; note: string | null; created_at: string; lounges?: { name: string; slug: string; city: string | null; state: string | null }; brands?: { name: string; slug: string }; broker_order_items: { cigar_name: string; boxes: number; price_per_box_cents: number }[] }
export interface BrokerMessage { id: string; sender_type: 'brand' | 'lounge'; body: string; created_at: string }

// ── Brand side ──────────────────────────────────────────────────────────────
export const getBrandListings = () => j<{ ok: boolean; listings: WholesaleListing[] }>('/api/brand/wholesale');
export const createBrandListing = (input: Record<string, unknown>) => j<{ ok: boolean; error?: string }>('/api/brand/wholesale', { method: 'POST', headers: brandHeaders(), body: JSON.stringify(input) });
export const updateBrandListing = (id: string, fields: Record<string, unknown>) => j<{ ok: boolean; error?: string }>('/api/brand/wholesale', { method: 'PATCH', headers: brandHeaders(), body: JSON.stringify({ id, ...fields }) });
export const deleteBrandListing = (id: string) => j<{ ok: boolean }>(`/api/brand/wholesale?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'x-csrf-token': csrf() } });
export const getBrandOrders = () => j<{ ok: boolean; orders: BrokerOrder[] }>('/api/brand/orders');
export const setBrandOrderStatus = (id: string, status: string) => j<{ ok: boolean; error?: string }>('/api/brand/orders', { method: 'PATCH', headers: brandHeaders(), body: JSON.stringify({ id, status }) });
export const getBrandThreads = () => j<{ ok: boolean; threads: { id: string; last_message_at: string; lounges?: { name: string; slug: string } }[] }>('/api/brand/threads');
export const getBrandMessages = (threadId: string) => j<{ ok: boolean; messages: BrokerMessage[] }>(`/api/brand/messages?threadId=${threadId}`);
export const sendBrandMessage = (threadId: string, body: string) => j<{ ok: boolean }>('/api/brand/messages', { method: 'POST', headers: brandHeaders(), body: JSON.stringify({ threadId, body }) });

// ── Lounge side ─────────────────────────────────────────────────────────────
export interface WholesaleBrand { brandId: string; name: string; slug: string; listings: { id: string; cigarName: string; vitola: string | null; cigarsPerBox: number; pricePerBox: number; boxesAvailable: number; moqBoxes: number; imageUrl: string | null }[] }
export const browseWholesale = () => j<{ ok: boolean; brands: WholesaleBrand[] }>('/api/wholesale');
export const placeOrder = (brandId: string, items: { listingId: string; boxes: number }[], note?: string) => j<{ ok: boolean; id?: string; total?: number; error?: string }>('/api/lounge/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId, items, note }) });
export const getLoungeOrders = () => j<{ ok: boolean; orders: BrokerOrder[] }>('/api/lounge/orders');
export const getLoungeThreads = () => j<{ ok: boolean; threads: { id: string; last_message_at: string; brands?: { name: string; slug: string } }[] }>('/api/lounge/threads');
export const getLoungeMessages = (threadId: string) => j<{ ok: boolean; messages: BrokerMessage[] }>(`/api/lounge/messages?threadId=${threadId}`);
export const sendLoungeMessage = (input: { threadId?: string; brandId?: string; body: string }) => j<{ ok: boolean; threadId?: string }>('/api/lounge/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });

export const fmtUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
