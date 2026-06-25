import { NextResponse } from 'next/server';
import { supabaseServer, supabaseService } from '@/lib/supabase';
import { validateLoungeCsrf } from '@/lib/lounge-broker';
import { checkRateLimit } from '@/lib/rate-limit';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

function confCode() { const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let r = ''; for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)]; return `PO-${r}`; }

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await svc.from('preorders').select('id, slug, cigar_name, quantity, status, confirmation_number, qr_token, created_at, lounges(name, slug)').eq('user_id', user.id).order('created_at', { ascending: false });
  return NextResponse.json({ ok: true, preorders: data ?? [] });
}

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Sign in to reserve.' }, { status: 401 });
  if (!validateLoungeCsrf(req)) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });

  // Verified Aficionado only.
  const { data: prof } = await svc.from('profiles').select('aficionado').eq('id', user.id).maybeSingle();
  if (!(prof as { aficionado: boolean } | null)?.aficionado) return NextResponse.json({ ok: false, error: 'Pre-orders are an Aficionado benefit. Upgrade to reserve releases.' }, { status: 403 });

  const rl = await checkRateLimit(`preorder:${user.id}`, { max: 15, windowSec: 3600 });
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'Too many requests — try again shortly.' }, { status: 429 });

  const b = await req.json().catch(() => ({}));
  const qty = Math.max(1, parseInt(b.quantity, 10) || 1);
  const { data: item } = await svc.from('inventory_items').select('id, lounge_id, slug, preorder_enabled, preorder_limit, coming_soon').eq('id', b.inventoryItemId).maybeSingle();
  const it = item as { id: string; lounge_id: string; slug: string; preorder_enabled: boolean; preorder_limit: number; coming_soon: boolean } | null;
  if (!it || !it.preorder_enabled || !it.coming_soon) return NextResponse.json({ ok: false, error: 'This item is not open for pre-order.' }, { status: 400 });

  // Enforce the lounge's pre-order limit (pending + approved + fulfilled count toward it).
  const { count: taken } = await svc.from('preorders').select('*', { count: 'exact', head: true }).eq('inventory_item_id', it.id).in('status', ['pending', 'approved', 'fulfilled']);
  const remaining = it.preorder_limit - (taken ?? 0);
  if (remaining <= 0) return NextResponse.json({ ok: false, error: 'Pre-orders are full for this release.' }, { status: 400 });
  if (qty > remaining) return NextResponse.json({ ok: false, error: `Only ${remaining} left to reserve.` }, { status: 400 });

  // One active reservation per user per item.
  const { count: mine } = await svc.from('preorders').select('*', { count: 'exact', head: true }).eq('inventory_item_id', it.id).eq('user_id', user.id).in('status', ['pending', 'approved']);
  if ((mine ?? 0) > 0) return NextResponse.json({ ok: false, error: 'You already have a reservation for this release.' }, { status: 400 });

  const cigarName = String(b.cigarName ?? 'Cigar');
  const { data: row, error } = await svc.from('preorders').insert({ lounge_id: it.lounge_id, inventory_item_id: it.id, slug: it.slug, cigar_name: cigarName, user_id: user.id, quantity: qty, status: 'pending', confirmation_number: confCode() } as never).select('id').single();
  if (error || !row) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not reserve.' }, { status: 500 });

  // Notify the lounge owner.
  try {
    const { data: lounge } = await svc.from('lounges').select('owner_id, name').eq('id', it.lounge_id).maybeSingle();
    const ownerId = (lounge as { owner_id: string | null } | null)?.owner_id;
    if (ownerId) await svc.from('notifications').insert({ user_id: ownerId, type: 'preorder', actor_name: 'Pre-order', entity_type: 'preorder', entity_id: '/dashboard', entity_name: `New pre-order: ${cigarName}`, read: false } as never);
  } catch { /* best effort */ }
  return NextResponse.json({ ok: true });
}
