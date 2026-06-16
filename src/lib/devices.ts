'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';

export interface LoungeDevice {
  id: string;
  loungeId: string;
  name: string;
  kind: 'tv' | 'menu';
  lat: number | null;
  lng: number | null;
  lastSeen: string | null;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  deviceId: string | null;
  amount: number;
  reason: string;
  createdAt: string;
}

const DEVICE_SELECT = 'id, lounge_id, name, kind, lat, lng, last_seen, created_at';

function toDevice(r: Record<string, unknown>): LoungeDevice {
  return {
    id: r.id as string,
    loungeId: r.lounge_id as string,
    name: (r.name as string) ?? 'TV',
    kind: ((r.kind as string) === 'menu' ? 'menu' : 'tv'),
    lat: (r.lat as number) ?? null,
    lng: (r.lng as number) ?? null,
    lastSeen: (r.last_seen as string) ?? null,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

export async function listDevices(loungeId: string): Promise<LoungeDevice[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('lounge_devices')
      .select(DEVICE_SELECT)
      .eq('lounge_id', loungeId)
      .order('created_at', { ascending: true });
    return (data ?? []).map(toDevice);
  } catch {
    return [];
  }
}

export async function addDevice(loungeId: string, name: string, kind: 'tv' | 'menu'): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not connected.' };
  try {
    const { error } = await supabaseBrowser().rpc('register_lounge_device', {
      p_lounge: loungeId, p_name: name, p_kind: kind,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function removeDevice(deviceId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabaseBrowser().from('lounge_devices').delete().eq('id', deviceId);
    return !error;
  } catch {
    return false;
  }
}

/** Sum of credits earned by a device today (from the daily accrual table). */
export async function todayCreditsByDevice(loungeId: string): Promise<Record<string, number>> {
  if (!isSupabaseConfigured || !loungeId) return {};
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabaseBrowser()
      .from('device_credit_daily')
      .select('device_id, credits, day')
      .eq('lounge_id', loungeId)
      .eq('day', today);
    const out: Record<string, number> = {};
    (data ?? []).forEach((r) => { out[r.device_id as string] = (r.credits as number) ?? 0; });
    return out;
  } catch {
    return {};
  }
}

export async function recentLedger(loungeId: string, limit = 10): Promise<CreditLedgerEntry[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('credit_ledger')
      .select('id, device_id, delta, reason, recorded_at')
      .eq('lounge_id', loungeId)
      .order('recorded_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      id: r.id as string, deviceId: (r.device_id as string) ?? null,
      amount: (r.delta as number) ?? 0, reason: (r.reason as string) ?? 'stream',
      createdAt: (r.recorded_at as string) ?? '',
    }));
  } catch {
    return [];
  }
}

export const CREDITS_PER_HOUR = 10;
export const DAILY_CAP_PER_TV = 120;

export interface DayStat { label: string; hours: number; credits: number; }

/** Last 7 days of streaming for a lounge, oldest → newest (real, from accrual). */
export async function streamStats7d(loungeId: string): Promise<DayStat[]> {
  const days: DayStat[] = [];
  const byDay: Record<string, { seconds: number; credits: number }> = {};
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    keys.push(key);
    days.push({ label: labels[d.getDay()], hours: 0, credits: 0 });
  }
  if (isSupabaseConfigured && loungeId) {
    try {
      const { data } = await supabaseBrowser()
        .from('device_credit_daily')
        .select('day, seconds, credits')
        .eq('lounge_id', loungeId)
        .gte('day', keys[0]);
      (data ?? []).forEach((r) => {
        const k = r.day as string;
        byDay[k] = byDay[k] || { seconds: 0, credits: 0 };
        byDay[k].seconds += (r.seconds as number) ?? 0;
        byDay[k].credits += (r.credits as number) ?? 0;
      });
      keys.forEach((k, i) => {
        if (byDay[k]) { days[i].hours = byDay[k].seconds / 3600; days[i].credits = byDay[k].credits; }
      });
    } catch { /* ignore */ }
  }
  return days;
}

/** Rename the lounge (and the owner's display name) — best effort. */
export async function renameLounge(loungeId: string | null, name: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !name.trim()) return { ok: false, error: 'Enter a name.' };
  try {
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    const uid = u.user?.id;
    if (uid) await sb.from('profiles').update({ display_name: name.trim() }).eq('id', uid);
    if (loungeId) {
      const { error } = await sb.from('lounges').update({ name: name.trim() }).eq('id', loungeId);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
