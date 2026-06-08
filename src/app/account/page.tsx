'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound, Loader2, Check, AlertTriangle, ArrowLeft, Bell } from 'lucide-react';
import { subscribeAuth, signOut, type Session } from '@/lib/auth';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';
import { getNotifySettings, saveNotifySettings, type NotifySettings } from '@/lib/notifications';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'in' | 'out'>('checking');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    return subscribeAuth((s) => {
      setSession(s);
      setAuthState(s ? 'in' : 'out');
    });
  }, []);

  if (authState === 'checking') {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-center"><Loader2 className="mx-auto animate-spin text-ember-400" /></div>;
  }
  if (authState === 'out') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl">Account Settings</h1>
        <p className="mt-2 text-smoke-300">Please <Link href="/register?next=/account" className="text-ember-100 underline-offset-2 hover:underline">sign in</Link> to manage your account.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pt-10">
      <Link href="/profile" className="mb-6 inline-flex items-center gap-1.5 text-sm text-smoke-400 hover:text-paper">
        <ArrowLeft size={14} strokeWidth={1.5} /> Back to profile
      </Link>
      <div className="eyebrow mb-2">Account</div>
      <h1 className="font-display text-4xl tracking-tightest">Account Settings</h1>
      <p className="mt-2 text-sm text-smoke-300">Signed in as <span className="text-paper">{session?.displayName}</span></p>

      <div className="mt-8 space-y-5">
        <ChangeEmail />
        <ChangePassword />
        <div id="notifications" className="scroll-mt-24">
          <NotificationSettings userId={session?.uuid ?? ''} />
        </div>
        <Deactivate onDone={() => router.push('/')} />
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-ember-400">{icon}</span>
        <h2 className="font-display text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none';

function NotificationSettings({ userId }: { userId: string }) {
  const [s, setS] = useState<NotifySettings | null>(null);
  useEffect(() => { if (userId) getNotifySettings(userId).then(setS); }, [userId]);

  async function toggle(key: keyof NotifySettings) {
    if (!s) return;
    const next = { ...s, [key]: !s[key] };
    setS(next);
    await saveNotifySettings(userId, { [key]: next[key] });
  }

  const rows: { key: keyof NotifySettings; label: string }[] = [
    { key: 'notify_follows', label: 'New followers' },
    { key: 'notify_likes', label: 'Likes on your activity' },
    { key: 'notify_comments', label: 'Comments on your activity' },
    { key: 'notify_lounges', label: 'Posts from lounges you follow' },
  ];

  return (
    <Card title="Notifications" icon={<Bell size={16} strokeWidth={1.5} />}>
      {!s ? (
        <div className="py-2"><Loader2 size={16} className="animate-spin text-ember-400" /></div>
      ) : (
        <div className="divide-y divide-ember-400/10">
          {rows.map((r) => (
            <label key={r.key} className="flex cursor-pointer items-center justify-between py-2.5 text-sm">
              <span className="text-smoke-200">{r.label}</span>
              <button
                type="button"
                onClick={() => toggle(r.key)}
                className={`relative h-5 w-9 rounded-full transition ${s[r.key] ? 'bg-ember-400' : 'bg-smoke-700'}`}
                aria-pressed={s[r.key]}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition ${s[r.key] ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}

function ChangeEmail() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    if (!email.trim() || !isSupabaseConfigured) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabaseBrowser().auth.updateUser({ email: email.trim() });
    setBusy(false);
    setMsg(error ? error.message : 'Check both your old and new inbox to confirm the change.');
  }

  return (
    <Card title="Change email" icon={<Mail size={16} strokeWidth={1.5} />}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="new@email.com" className={inputCls} />
      <button onClick={save} disabled={busy || !email.trim()} className="mt-3 inline-flex items-center gap-2 rounded-md bg-ember-400 px-4 py-2 text-sm font-medium text-paper hover:bg-ember-600 disabled:opacity-60">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2} />} Update email
      </button>
      {msg && <p className="mt-2 text-xs text-smoke-300">{msg}</p>}
    </Card>
  );
}

function ChangePassword() {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    if (pw.length < 8) return setMsg('Password must be at least 8 characters.');
    if (pw !== confirm) return setMsg('Passwords do not match.');
    if (!isSupabaseConfigured) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg('Password updated.');
      setPw('');
      setConfirm('');
    }
  }

  return (
    <Card title="Change password" icon={<KeyRound size={16} strokeWidth={1.5} />}>
      <div className="space-y-2">
        <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="New password" className={inputCls} />
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="Confirm new password" className={inputCls} />
      </div>
      <button onClick={save} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-md bg-ember-400 px-4 py-2 text-sm font-medium text-paper hover:bg-ember-600 disabled:opacity-60">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2} />} Update password
      </button>
      {msg && <p className="mt-2 text-xs text-smoke-300">{msg}</p>}
    </Card>
  );
}

function Deactivate({ onDone }: { onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function deactivate() {
    setBusy(true);
    // Client-side cannot hard-delete an auth user (needs the service role). We
    // flag the profile as deactivated and sign the user out; a server job can
    // complete the deletion.
    if (isSupabaseConfigured) {
      try {
        await supabaseBrowser().auth.updateUser({ data: { deactivated_at: new Date().toISOString() } });
      } catch {
        /* ignore */
      }
    }
    await signOut();
    setBusy(false);
    onDone();
  }

  return (
    <Card title="Deactivate account" icon={<AlertTriangle size={16} strokeWidth={1.5} />}>
      <p className="text-sm text-smoke-300">
        This signs you out and flags your account for deactivation. To permanently delete your data,
        email <a href="mailto:submissions@cigartv.com" className="text-ember-100 hover:underline">submissions@cigartv.com</a>.
      </p>
      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="mt-3 inline-flex items-center gap-2 rounded-md border-[0.5px] border-red-500/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/10">
          Deactivate account
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button onClick={deactivate} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-red-500/80 px-4 py-2 text-sm font-medium text-paper hover:bg-red-500 disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null} Yes, deactivate
          </button>
          <button onClick={() => setConfirming(false)} className="text-sm text-smoke-400 hover:text-paper">Cancel</button>
        </div>
      )}
    </Card>
  );
}
