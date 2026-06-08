'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import {
  getNotifications, markAllRead, subscribeNotifications, describeNotification, type AppNotification,
} from '@/lib/notifications';

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeAuth((s) => setUserId(s?.uuid ?? null)), []);

  useEffect(() => {
    if (!userId) { setItems([]); return; }
    let off = false;
    const load = () => getNotifications(userId).then((n) => !off && setItems(n));
    load();
    const unsub = subscribeNotifications(load);
    return () => { off = true; unsub(); };
  }, [userId]);

  if (!userId) return null;
  const unread = items.filter((n) => !n.read).length;

  function openMenu() {
    setOpen((v) => !v);
    if (!open && unread > 0 && userId) {
      markAllRead(userId).then(() => setItems((prev) => prev.map((n) => ({ ...n, read: true }))));
    }
  }

  return (
    <div className="relative">
      <button onClick={openMenu} className="relative flex h-9 w-9 items-center justify-center rounded-md border-[0.5px] border-ember-400/20 bg-char/60 text-smoke-200 hover:bg-ember-400/10" aria-label="Notifications">
        <Bell size={15} strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-400 px-1 text-[10px] font-semibold text-paper">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border-[0.5px] border-ember-400/20 bg-char shadow-xl">
            <div className="border-b border-ember-400/10 px-4 py-2.5 text-xs uppercase tracking-wider text-smoke-400">Notifications</div>
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-smoke-400">You’re all caught up.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {items.map((n) => (
                  <div key={n.id} className="border-b border-ember-400/5 px-4 py-2.5 text-sm text-smoke-200 last:border-0">
                    {describeNotification(n)}
                    <span className="ml-1 text-xs text-smoke-500">· {ago(n.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
