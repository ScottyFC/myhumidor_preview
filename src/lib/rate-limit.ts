import 'server-only';
import { svc } from '@/lib/brand-auth';

export interface RateOptions { max: number; windowSec: number; lockSec?: number }
export interface RateResult { allowed: boolean; retryAfter?: number }

/** DB-backed fixed-window limiter. Returns allowed=false (with retryAfter seconds) when
 *  the key is locked or has exceeded `max` hits within `windowSec`. Fails OPEN if the
 *  store is unavailable (never locks people out due to infra issues). */
export async function checkRateLimit(key: string, opts: RateOptions): Promise<RateResult> {
  const sb = svc();
  if (!sb) return { allowed: true };
  const now = Date.now();
  try {
    const { data } = await sb.from('auth_rate_limits').select('count, window_start, locked_until').eq('key', key).maybeSingle();
    const row = data as { count: number; window_start: string; locked_until: string | null } | null;

    if (row?.locked_until && new Date(row.locked_until).getTime() > now) {
      return { allowed: false, retryAfter: Math.ceil((new Date(row.locked_until).getTime() - now) / 1000) };
    }

    const windowStart = row ? new Date(row.window_start).getTime() : 0;
    const inWindow = row && now - windowStart < opts.windowSec * 1000;
    const count = inWindow ? row!.count + 1 : 1;

    if (count > opts.max) {
      const lockMs = (opts.lockSec ?? opts.windowSec) * 1000;
      const lockedUntil = new Date(now + lockMs).toISOString();
      await sb.from('auth_rate_limits').upsert({ key, count, window_start: new Date(inWindow ? windowStart : now).toISOString(), locked_until: lockedUntil } as never);
      return { allowed: false, retryAfter: Math.ceil(lockMs / 1000) };
    }
    await sb.from('auth_rate_limits').upsert({ key, count, window_start: new Date(inWindow ? windowStart : now).toISOString(), locked_until: null } as never);
    return { allowed: true };
  } catch {
    return { allowed: true }; // fail open
  }
}

/** Clear a key (e.g. after a successful login). */
export async function clearRateLimit(key: string): Promise<void> {
  const sb = svc();
  if (!sb) return;
  try { await sb.from('auth_rate_limits').delete().eq('key', key); } catch { /* ignore */ }
}

/** Best-effort client IP from forwarded headers. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get('x-forwarded-for')?.split(',')[0].trim()) || h.get('x-real-ip') || 'unknown';
}
