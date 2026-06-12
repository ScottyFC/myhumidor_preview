import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

/**
 * POST /api/track — first-party analytics sink.
 * The client sends only behavior (path, entity, duration); everything
 * sensitive-ish is derived server-side from the request itself:
 *  - coarse location from Vercel geo headers (country/region/city — no IP stored)
 *  - device / OS / browser from the user agent
 * Inserts use the service key, so there is no public insert path to spam.
 * Without SUPABASE_SERVICE_KEY configured this is a silent no-op.
 */

function parseUA(ua: string) {
  const device = /mobile|iphone|android(?!.*tablet)/i.test(ua) ? 'mobile'
    : /ipad|tablet/i.test(ua) ? 'tablet' : 'desktop';
  const os = /windows/i.test(ua) ? 'Windows' : /mac os x/i.test(ua) ? 'macOS'
    : /android/i.test(ua) ? 'Android' : /iphone|ipad|ios/i.test(ua) ? 'iOS'
    : /linux/i.test(ua) ? 'Linux' : 'other';
  const browser = /edg\//i.test(ua) ? 'Edge' : /opr\//i.test(ua) ? 'Opera'
    : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari'
    : /firefox|fxios/i.test(ua) ? 'Firefox' : 'other';
  return { device, os, browser };
}

export async function POST(req: Request) {
  try {
    const svc = supabaseService();
    if (!svc) return NextResponse.json({ ok: true }); // not configured — no-op

    const body = (await req.json()) as {
      sid?: string; event?: 'view' | 'leave'; path?: string;
      entityType?: string | null; entityId?: string | null;
      durationMs?: number | null; userId?: string | null; referrer?: string | null;
    };
    if (!body.sid || !body.event || !body.path) return NextResponse.json({ ok: false });
    if (body.event !== 'view' && body.event !== 'leave') return NextResponse.json({ ok: false });

    const h = req.headers;
    const ua = h.get('user-agent') ?? '';
    const { device, os, browser } = parseUA(ua);

    await svc.from('page_events').insert({
      session_id: String(body.sid).slice(0, 64),
      user_id: body.userId || null,
      event: body.event,
      path: String(body.path).slice(0, 300),
      entity_type: body.entityType || null,
      entity_id: body.entityId ? String(body.entityId).slice(0, 200) : null,
      duration_ms: typeof body.durationMs === 'number' ? Math.min(body.durationMs, 3_600_000) : null,
      country: h.get('x-vercel-ip-country'),
      region: h.get('x-vercel-ip-country-region'),
      city: h.get('x-vercel-ip-city') ? decodeURIComponent(h.get('x-vercel-ip-city')!) : null,
      device, os, browser,
      referrer: body.referrer ? String(body.referrer).slice(0, 300) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // analytics must never break the app
  }
}
