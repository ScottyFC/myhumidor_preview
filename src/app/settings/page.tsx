'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { subscribeAuth, canRetail, setAccountMode, type Session } from '@/lib/auth';
import type { AccountType } from '@/lib/ids';
import { getNotifySettings, saveNotifySettings, type NotifySettings } from '@/lib/notifications';

const TOGGLES: { key: keyof NotifySettings; label: string; hint: string }[] = [
  { key: 'notify_follows', label: 'New followers', hint: 'When someone follows you' },
  { key: 'notify_likes', label: 'Likes', hint: 'When someone likes your review or check-in' },
  { key: 'notify_comments', label: 'Comments', hint: 'When someone comments on your activity' },
  { key: 'notify_lounges', label: 'Lounge posts', hint: 'Updates from lounges you follow' },
  { key: 'notify_inventory', label: 'New inventory', hint: 'When a lounge you follow adds a cigar' },
  { key: 'notify_new_lounges', label: 'New lounges nearby', hint: 'When a lounge opens in your area' },
  { key: 'notify_daily_top', label: 'Daily top-rated', hint: 'A daily pick of the highest-rated cigars' },
  { key: 'notify_system', label: 'Announcements', hint: 'Important updates from MyHumidor' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [retailCapable, setRetailCapable] = useState(false);
  const [s, setS] = useState<NotifySettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => subscribeAuth((sess) => { setSession(sess); setUserId(sess?.uuid ?? null); }), []);
  useEffect(() => { if (session) canRetail(session.uuid, session.baseType).then(setRetailCapable); }, [session]);
  useEffect(() => {
    if (userId === undefined) return;
    if (!userId) { router.replace('/register?next=/settings'); return; }
    getNotifySettings(userId).then(setS);
  }, [userId, router]);

  async function toggle(key: keyof NotifySettings) {
    if (!s || !userId) return;
    const next = { ...s, [key]: !s[key] };
    setS(next); setSaved(false);
    const ok = await saveNotifySettings(userId, { [key]: next[key] });
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  if (!s) return <div className="mx-auto max-w-2xl px-6 pt-16 text-center text-smoke-400"><Loader2 className="mx-auto animate-spin text-ember-400" /></div>;

  return (
    <div className="mx-auto max-w-2xl px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tightest">Settings</h1>

      {session && (
        <section className="mt-6">
          <h2 className="font-display text-xl">Account</h2>
          {retailCapable ? (
            <>
              <p className="mt-1 text-sm text-smoke-400">Switch how you use MyHumidor. Your humidor and retailer tools stay separate.</p>
              <div className="mt-3 inline-flex rounded-xl border-[0.5px] border-ember-400/20 bg-char/40 p-1">
                {(['consumer', 'retailer'] as AccountType[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setAccountMode(m)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${session.type === m ? 'bg-ember-400 text-paper' : 'text-smoke-300 hover:text-paper'}`}
                  >
                    {m === 'consumer' ? 'Cigar Aficionado' : 'Retailer'}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-smoke-400">Run a cigar lounge or shop? Link a retailer account to manage inventory, posts, and certification.</p>
              <Link href="/register?type=retailer" className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600">
                Link a retailer account
              </Link>
            </>
          )}
        </section>
      )}

      <h2 className="mt-10 font-display text-xl">Notifications</h2>
      <p className="mt-1 flex items-center gap-2 text-sm text-smoke-400">
        Choose what you’re notified about. {saved && <span className="inline-flex items-center gap-1 text-ember-100"><Check size={12} strokeWidth={2} /> Saved</span>}
      </p>

      <div className="mt-6 divide-y divide-ember-400/10 overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
        {TOGGLES.map((t) => (
          <button key={t.key} onClick={() => toggle(t.key)} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-char/40">
            <div className="min-w-0">
              <div className="text-sm font-medium text-paper">{t.label}</div>
              <div className="text-xs text-smoke-400">{t.hint}</div>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${s[t.key] ? 'bg-ember-400' : 'bg-smoke-700'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition ${s[t.key] ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-smoke-500">
        These control in-app notifications now, and push notifications once enabled on your device.
      </p>
    </div>
  );
}
