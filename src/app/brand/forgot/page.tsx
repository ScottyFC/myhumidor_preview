'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Recaptcha } from '@/components/Recaptcha';

export default function BrandForgotPage() {
  const [email, setEmail] = useState(''); const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  async function submit() {
    setBusy(true);
    try { await fetch('/api/brand-auth/reset-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, recaptchaToken: token }) }); } catch { /* ignore */ }
    setBusy(false); setDone(true);
  }
  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-4xl tracking-tightest">Reset brand password</h1>
      {done ? (
        <p className="mt-3 text-sm text-smoke-200">If an active brand account exists for that email, we’ve sent a reset link. It’s valid for one hour. Check your inbox (and spam).</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-smoke-300">Enter your brand account email and we’ll send a reset link.</p>
          <div className="mt-6 space-y-3">
            <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Recaptcha onToken={setToken} />
            <button onClick={submit} disabled={busy || !email} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-50">
              {busy ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Send reset link'}
            </button>
          </div>
        </>
      )}
      <p className="mt-6 text-center text-xs text-smoke-400"><Link href="/brand/login" className="text-ember-400 underline">Back to login</Link></p>
    </div>
  );
}
