'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { updatePassword } from '@/lib/auth';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit() {
    setErr(null);
    if (password.length < 8) return setErr('Password must be at least 8 characters.');
    if (password !== confirm) return setErr('Passwords don’t match.');
    setBusy(true);
    const res = await updatePassword(password); setBusy(false);
    if (!res.ok) { setErr(res.error ?? 'Reset failed. Open the reset link from your email again.'); return; }
    setDone(true);
  }
  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-4xl tracking-tightest">Set a new password</h1>
      {done ? (
        <p className="mt-3 text-sm text-smoke-200">Your password has been updated. <Link href="/register" className="text-ember-400 underline">Sign in</Link>.</p>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-smoke-300">Open this page from the link in your reset email, then choose a new password.</p>
          <input className={input} type="password" placeholder="New password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className={input} type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {err && <p className="text-sm text-red-300">{err}</p>}
          <button onClick={submit} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-50">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Update password'}
          </button>
        </div>
      )}
    </div>
  );
}
