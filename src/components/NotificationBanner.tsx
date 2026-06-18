'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import {
  getNotifications, subscribeNotifications, describeNotification, notificationHref, type AppNotification,
} from '@/lib/notifications';

/**
 * Transient banner that slides in when a new notification arrives (in-app
 * "system banner"), plays the alert sound, links to the right place, and
 * auto-dismisses. Seeds a baseline on load so existing notifications don't
 * banner retroactively.
 */
export function NotificationBanner() {
  const [uuid, setUuid] = useState<string | null>(null);
  const [banner, setBanner] = useState<AppNotification | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const seeded = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeAuth((s) => setUuid(s?.uuid ?? null)), []);

  useEffect(() => {
    if (typeof Audio !== 'undefined') {
      audio.current = new Audio('/sounds/notify.wav');
      audio.current.preload = 'auto';
      audio.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    if (!uuid) { seeded.current = false; seen.current = new Set(); return; }

    const handle = (list: AppNotification[]) => {
      if (!seeded.current) {
        list.forEach((n) => seen.current.add(n.id));
        seeded.current = true;
        return;
      }
      const fresh = list.filter((n) => !seen.current.has(n.id));
      fresh.forEach((n) => seen.current.add(n.id));
      if (fresh.length === 0) return;
      // newest first from getNotifications
      const latest = fresh[0];
      setBanner(latest);
      try { audio.current && (audio.current.currentTime = 0, void audio.current.play()); } catch { /* autoplay/interaction */ }
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setBanner(null), 6000);
    };

    getNotifications(uuid).then(handle);
    const unsub = subscribeNotifications(() => getNotifications(uuid).then(handle));
    return () => { unsub(); if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [uuid]);

  if (!banner) return null;
  const href = notificationHref(banner);

  const body = (
    <div className="flex items-start gap-3 rounded-xl border-[0.5px] border-ember-400/30 bg-char/95 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-lg">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember-400/15 text-ember-400">
        <Bell size={15} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 text-sm text-paper">{describeNotification(banner)}</div>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBanner(null); }}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-smoke-400 hover:text-paper"
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <div
      className="native-topbar fixed inset-x-0 top-0 z-[80] mx-auto w-full max-w-md px-3 pt-3"
      style={{ animation: 'mh-slide-down 280ms ease-out' }}
    >
      {href ? <Link href={href} onClick={() => setBanner(null)} className="block">{body}</Link> : body}
    </div>
  );
}
