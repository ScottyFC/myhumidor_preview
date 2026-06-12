'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Globe2, MonitorSmartphone, Clock, Loader2 } from 'lucide-react';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';

interface EntityRow { entity_type: string; entity_id: string; views: number; seconds_spent: number; sessions: number }
interface PathRow { path: string; views: number; avg_ms: number; sessions: number }
interface GeoRow { country: string; region: string; city: string; sessions: number }
interface DeviceRow { device: string; browser: string; os: string; sessions: number }

/** Admin-only: what people view most, from where, on what (30-day window). */
export function AnalyticsPanel() {
  const [entities, setEntities] = useState<EntityRow[] | null>(null);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [geo, setGeo] = useState<GeoRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setEntities([]); return; }
    const sb = supabaseBrowser();
    Promise.all([
      sb.from('analytics_top_entities').select('*').order('views', { ascending: false }).limit(30),
      sb.from('analytics_top_paths').select('*').order('views', { ascending: false }).limit(12),
      sb.from('analytics_geo').select('*').order('sessions', { ascending: false }).limit(12),
      sb.from('analytics_devices').select('*').order('sessions', { ascending: false }).limit(8),
    ]).then(([e, p, g, d]) => {
      setEntities((e.data as EntityRow[]) ?? []);
      setPaths((p.data as PathRow[]) ?? []);
      setGeo((g.data as GeoRow[]) ?? []);
      setDevices((d.data as DeviceRow[]) ?? []);
    });
  }, []);

  if (entities === null) return <Loader2 size={18} className="animate-spin text-ember-400" />;

  const byType = (t: string) => entities.filter((e) => e.entity_type === t).slice(0, 8);
  const href = (e: EntityRow) =>
    e.entity_type === 'cigar' ? `/cigars/${e.entity_id}` : e.entity_type === 'lounge' ? `/lounges/${e.entity_id}` : `/brands/${e.entity_id}`;

  if (entities.length === 0 && paths.length === 0) {
    return (
      <p className="text-sm text-smoke-400">
        No analytics yet. Run <code className="text-ember-100">phase31.sql</code>, set <code className="text-ember-100">SUPABASE_SERVICE_KEY</code> in
        Vercel, and traffic will start populating here (30-day window).
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {(['cigar', 'lounge', 'brand'] as const).map((t) => (
          <section key={t}>
            <h3 className="eyebrow mb-3 flex items-center gap-1.5">
              <BarChart3 size={12} strokeWidth={1.5} className="text-ember-400" /> Top {t}s viewed
            </h3>
            <div className="space-y-1.5">
              {byType(t).length === 0 && <div className="text-xs text-smoke-500">No {t} views yet.</div>}
              {byType(t).map((e, i) => (
                <Link key={e.entity_id} href={href(e)} className="flex items-center justify-between gap-2 rounded-md border-[0.5px] border-ember-400/10 bg-char/40 px-3 py-2 text-xs hover:border-ember-400/35">
                  <span className="truncate"><span className="mr-1.5 font-display italic text-ember-400">{i + 1}</span>{e.entity_id}</span>
                  <span className="shrink-0 tabular text-smoke-400">{e.views} views · {Math.round(e.seconds_spent / 60)}m</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section>
          <h3 className="eyebrow mb-3 flex items-center gap-1.5"><Clock size={12} strokeWidth={1.5} className="text-ember-400" /> Most visited pages</h3>
          <div className="space-y-1.5">
            {paths.map((p) => (
              <div key={p.path} className="flex items-center justify-between gap-2 rounded-md bg-char/40 px-3 py-2 text-xs">
                <span className="truncate">{p.path}</span>
                <span className="shrink-0 tabular text-smoke-400">{p.views} · {(p.avg_ms / 1000).toFixed(0)}s avg</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="eyebrow mb-3 flex items-center gap-1.5"><Globe2 size={12} strokeWidth={1.5} className="text-ember-400" /> Where visitors are</h3>
          <div className="space-y-1.5">
            {geo.map((g, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-char/40 px-3 py-2 text-xs">
                <span className="truncate">{[g.city, g.region, g.country].filter(Boolean).join(', ')}</span>
                <span className="shrink-0 tabular text-smoke-400">{g.sessions} sessions</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="eyebrow mb-3 flex items-center gap-1.5"><MonitorSmartphone size={12} strokeWidth={1.5} className="text-ember-400" /> Devices</h3>
          <div className="space-y-1.5">
            {devices.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-char/40 px-3 py-2 text-xs">
                <span className="truncate capitalize">{d.device} · {d.browser} · {d.os}</span>
                <span className="shrink-0 tabular text-smoke-400">{d.sessions}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
