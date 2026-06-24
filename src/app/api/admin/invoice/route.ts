import { NextResponse } from 'next/server';
import { supabaseServer, supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendBrandEmail } from '@/lib/brand-auth';

export const runtime = 'nodejs';

async function isAdmin(): Promise<boolean> {
  try {
    const ss = await supabaseServer();
    const { data: u } = await ss.auth.getUser();
    if (!u?.user) return false;
    const { data } = await ss.rpc('_is_admin' as never);
    return data === true;
  } catch { return false; }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'admins only' }, { status: 403 });
  const sb = supabaseService() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const amountCents = Math.round(Number(b.amountCents));
  if (!b.brandId || !Number.isFinite(amountCents) || amountCents <= 0) return NextResponse.json({ ok: false, error: 'Brand and amount required.' }, { status: 400 });

  const send = !!b.send;
  const { data: inv, error } = await sb.from('brand_invoices').insert({
    brand_id: b.brandId, amount_cents: amountCents, description: b.description ?? null,
    period: b.period ?? null, due_date: b.dueDate ?? null,
    status: send ? 'sent' : 'draft', sent_at: send ? new Date().toISOString() : null,
  } as never).select('id').single();
  if (error || !inv) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not create invoice.' }, { status: 500 });

  let emailed = false;
  if (send) {
    const { data: brand } = await sb.from('brands').select('name, contact_email').eq('id', b.brandId).maybeSingle();
    const br = brand as { name: string; contact_email: string | null } | null;
    if (br?.contact_email) {
      const amount = (amountCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'usd' });
      emailed = await sendBrandEmail(br.contact_email, `MyHumidor invoice — ${amount}`,
        `<p>Hi ${br.name},</p><p>An invoice of <strong>${amount}</strong>${b.period ? ` for ${b.period}` : ''} has been issued for your MyHumidor brand subscription.</p>${b.description ? `<p>${b.description}</p>` : ''}${b.dueDate ? `<p>Due: ${b.dueDate}</p>` : ''}<p>Thank you.</p>`);
    }
  }
  return NextResponse.json({ ok: true, emailed });
}
