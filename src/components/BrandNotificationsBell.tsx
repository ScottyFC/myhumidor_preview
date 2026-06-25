'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { getBrandNotifications, markBrandNotificationsRead, type BrandNotif } from '@/lib/broker';

export function BrandNotificationsBell() {
  const [items, setItems] = useState<BrandNotif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => { const r = await getBrandNotifications(); if (r.ok) { setItems(r.items); setUnread(r.unread); } }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function toggle() {
    const next = !open; setOpen(next);
    if (next && unread > 0) { await markBrandNotificationsRead(); setUnread(0); setItems((xs) => xs.map((x) => ({ ...x, read: true }))); }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-ember-400/20 text-smoke-200 hover:text-ember-100" aria-label="Notifications">
        <Bell size={16} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-400 px-1 text-[10px] font-medium text-ink">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border-[0.5px] border-ember-400/20 bg-[#15110b] shadow-2xl">
          <div className="border-b-[0.5px] border-ember-400/15 px-3 py-2 text-xs uppercase tracking-wide text-smoke-400">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-smoke-500">Nothing yet.</p>}
            {items.map((n) => (
              <a key={n.id} href={n.href ?? '#'} className="block border-b-[0.5px] border-ember-400/5 px-3 py-2.5 hover:bg-ember-400/5">
                <div className="text-sm font-medium text-paper">{n.title}</div>
                {n.body && <div className="truncate text-xs text-smoke-400">{n.body}</div>}
                <div className="mt-0.5 text-[10px] text-smoke-500">{new Date(n.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
