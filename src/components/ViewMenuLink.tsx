'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';

/** Menu (food/drink) link for signed-in users. Opens the PDF IN-APP — an in-app
 *  browser sheet on the native app, or a modal viewer on web — instead of kicking
 *  out to an external browser. Signed-out users are prompted to register. */
export function ViewMenuLink({ url, label = 'menu' }: { url: string; label?: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeAuth((s) => setSignedIn(!!s)), []);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function view() {
    // Native app: open in an in-app browser sheet (stays inside the app).
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url, presentationStyle: 'fullscreen' });
        return;
      }
    } catch { /* fall back to the web modal */ }
    setOpen(true);
  }

  if (signedIn === false) {
    return <a href="/register" className="text-ember-400 underline">· Sign in to view {label}</a>;
  }

  return (
    <>
      <button onClick={view} className="text-ember-400 underline">· View {label}</button>

      {open && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-black/85 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
            <span className="text-sm font-medium capitalize text-paper">{label}</span>
            <div className="flex items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-char/80 px-2.5 py-1.5 text-xs text-paper">
                <ExternalLink size={13} /> Open
              </a>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md bg-char/80 p-2 text-paper"><X size={16} /></button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            {loading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Loader2 size={26} className="animate-spin text-ember-400" />
              </div>
            )}
            <iframe
              src={url}
              title={label}
              onLoad={() => setLoading(false)}
              className="h-full w-full bg-white"
            />
          </div>
          <p className="px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 text-center text-[11px] text-smoke-400">
            Can’t see it? Tap <span className="text-paper">Open</span> above.
          </p>
        </div>
      )}
    </>
  );
}
