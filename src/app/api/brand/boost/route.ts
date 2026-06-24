import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf } from '@/lib/brand-auth';

export const runtime = 'nodejs';

// Consume one monthly boost (resets at the start of each month). Premium = unlimited.
export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc();
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });

  const { data } = await sb.from('brand_subscriptions').select('*').eq('brand_id', s.brandId).maybeSingle();
  const sub = data as Record<string, unknown> | null;
  if (!sub) return NextResponse.json({ ok: false });

  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  let used = Number(sub.boosts_used) || 0;
  const periodStart = sub.boosts_period_start ? new Date(String(sub.boosts_period_start) + 'T00:00:00Z') : new Date(0);
  if (periodStart < monthStart) used = 0; // new month → reset
  const quota = Number(sub.monthly_boost_quota) || 0;
  if (used >= quota) return NextResponse.json({ ok: false, error: 'No boosts left this month.' });

  const { error } = await sb.from('brand_subscriptions').update({
    boosts_used: used + 1, boosts_period_start: monthStart.toISOString().slice(0, 10),
  } as never).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true });
}
