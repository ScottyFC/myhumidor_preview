'use client';
function csrf(): string {
  if (typeof document === 'undefined') return '';
  let m = document.cookie.match(/(?:^|;\s*)mh_csrf=([^;]+)/);
  if (!m) { const t = (crypto?.randomUUID?.() ?? String(Math.random()).slice(2)) + Date.now().toString(36); document.cookie = `mh_csrf=${t}; path=/; SameSite=Lax`; m = [`mh_csrf=${t}`, t] as RegExpMatchArray; }
  return decodeURIComponent(m[1]);
}
const H = () => ({ 'Content-Type': 'application/json', 'x-csrf-token': csrf() });
async function j<T>(u: string, init?: RequestInit): Promise<T> { const r = await fetch(u, init); return r.json().catch(() => ({})) as Promise<T>; }

export interface MyPreorder { id: string; cigar_name: string; quantity: number; status: string; confirmation_number: string; qr_token: string; created_at: string; lounges?: { name: string; slug: string } }
export interface LoungePreorder { id: string; cigar_name: string; quantity: number; status: string; confirmation_number: string; created_at: string; profiles?: { handle: string; display_name: string } }

export const listMyPreorders = () => j<{ ok: boolean; preorders: MyPreorder[] }>('/api/preorders');
export const placePreorder = (input: { inventoryItemId: string; cigarName: string; quantity?: number }) => j<{ ok: boolean; error?: string }>('/api/preorders', { method: 'POST', headers: H(), body: JSON.stringify(input) });
export const listLoungePreorders = () => j<{ ok: boolean; preorders: LoungePreorder[] }>('/api/lounge/preorders');
export const decidePreorder = (id: string, decision: 'approved' | 'declined' | 'cancelled') => j<{ ok: boolean; error?: string }>('/api/lounge/preorders', { method: 'PATCH', headers: H(), body: JSON.stringify({ id, decision }) });
export const confirmPreorder = (input: { code?: string; token?: string }) => j<{ ok: boolean; error?: string; cigarName?: string; code?: string; customer?: string }>('/api/lounge/preorders/confirm', { method: 'POST', headers: H(), body: JSON.stringify(input) });
