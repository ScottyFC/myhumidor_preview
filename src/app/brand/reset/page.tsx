'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Recaptcha } from '@/components/Recaptcha';

function ResetInner() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [cap, setCap] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit() {
    setErr(null);
    if (password.length < 8) return setErr('Password must be at least 8 characters.');
    if (password !== confirm) return setErr('Passwords don’t match.');
    setBusy(true);
    try {
      const r = await fetch('/api/brand-auth/reset-confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password, recaptchaToken: cap }) });
      const j = await r.json(); setBusy(false);
      if (!r.ok || !j.ok) { setErr(j.error ?? 'Reset failed.'); return; }
      setDone(true);
    } catch { setBusy(false); setErr('Network error.'); }
  }
  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  if (!token) return <p className="text-sm text-smoke-300">Missing reset token. Request a new link from <Link href="/brand/forgot" className="text-ember-400 underline">Forgot password</Link>.</p>;
  return (
    <>
      <h1 className="font-display text-4xl tracking-tightest">Set a new password</h1>
      {done ? (
        <p className="mt-3 text-sm text-smoke-200">Your password has been reset. <Link href="/brand/login" className="text-ember-400 underline">Sign in</Link>.</p>
      ) : (
        <div className="mt-6 space-y-3">
          <input className={input} type="password" placeholder="New password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className={input} type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Recaptcha onToken={setCap} />
          {err && <p className="text-sm text-red-300">{err}</p>}
          <button onClick={submit} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-50">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Reset password'}
          </button>
        </div>
      )}
    </>
  );
}

export default function BrandResetPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <Suspense fallback={<Loader2 className="animate-spin text-ember-400" />}><ResetInner /></Suspense>
    </div>
  );
}
