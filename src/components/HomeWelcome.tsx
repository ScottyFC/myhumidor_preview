'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Box, Heart, Store, Star, LayoutDashboard, ScanLine } from 'lucide-react';
import { subscribeAuth, type Session } from '@/lib/auth';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type QuickLink = { label: string; href: string; icon: typeof Box };

/** Personalized greeting + data-aware quick links on the home screen. */
export function HomeWelcome() {
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState('');
  const [links, setLinks] = useState<QuickLink[]>([]);

  useEffect(() => subscribeAuth(setSession), []);

  useEffect(() => {
    if (!session) { setName(''); setLinks([]); return; }
    let cancelled = false;
    (async () => {
      let humidorCount = 0, ratingCount = 0, display = '';
      if (isSupabaseConfigured) {
        try {
          const sb = supabaseBrowser();
          const [{ data: p }, hc, rc] = await Promise.all([
            sb.from('profiles').select('display_name').eq('id', session.uuid).maybeSingle(),
            sb.from('humidor_entries').select('*', { count: 'exact', head: true }).eq('user_id', session.uuid),
            sb.from('ratings').select('*', { count: 'exact', head: true }).eq('user_id', session.uuid),
          ]);
          display = p?.display_name ?? '';
          humidorCount = hc.count ?? 0;
          ratingCount = rc.count ?? 0;
        } catch { /* ignore */ }
      }
      if (cancelled) return;
      setName((display || session.email?.split('@')[0] || '').split(' ')[0]);

      const l: QuickLink[] = [];
      if (session.type === 'retailer') l.push({ label: 'Your dashboard', href: '/dashboard', icon: LayoutDashboard });
      l.push(humidorCount > 0
        ? { label: `Your humidor (${humidorCount})`, href: '/humidor', icon: Box }
        : { label: 'Start your humidor', href: '/top', icon: Box });
      l.push(ratingCount === 0
        ? { label: 'Rate your first cigar', href: '/top', icon: Star }
        : { label: 'For You', href: '/top', icon: Heart });
      l.push({ label: 'Lounges', href: '/lounges', icon: Store });
      setLinks(l.slice(0, 4));
    })();
    return () => { cancelled = true; };
  }, [session]);

  if (!session) return null;

  return (
    <div className="mb-4">
      <h2 className="font-display text-2xl tracking-tight text-paper">{greeting()}{name ? `, ${name}` : ''}</h2>
      <p className="text-sm text-smoke-400">Pick up where you left off.</p>
      {links.length > 0 && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.label} href={l.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-[0.5px] border-ember-400/25 bg-char/60 px-3.5 py-2 text-xs font-medium text-smoke-200 active:bg-ember-400/10">
                <Icon size={13} strokeWidth={1.75} className="text-ember-400" /> {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
