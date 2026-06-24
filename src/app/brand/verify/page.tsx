'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Recaptcha } from '@/components/Recaptcha';

function VerifyInner() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'idle' | 'verifying' | 'ok' | 'fail'>(token ? 'verifying' : 'idle');
  const [email, setEmail] = useState(''); const [cap, setCap] = useState<string | null>(null);
  const [resent, setResent] = useState(false); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch('/api/brand-auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
        const j = await r.json();
        setState(r.ok && j.ok ? 'ok' : 'fail');
      } catch { setState('fail'); }
    })();
  }, [token]);

  async function resend() {
    setBusy(true);
    try { await fetch('/api/brand-auth/verify-resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, recaptchaToken: cap }) }); } catch { /* ignore */ }
    setBusy(false); setResent(true);
  }

  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <>
      {state === 'verifying' && <p className="flex items-center gap-2 text-sm text-smoke-200"><Loader2 size={16} className="animate-spin text-ember-400" /> Verifying your email…</p>}
      {state === 'ok' && (
        <div className="text-center">
          <CheckCircle2 size={28} className="mx-auto text-ember-400" />
          <h1 className="mt-3 font-display text-3xl tracking-tightest">Email verified</h1>
          <p className="mt-2 text-sm text-smoke-200">Thanks! Once a super admin approves your application, you can sign in.</p>
          <Link href="/brand/login" className="mt-5 inline-block rounded-lg bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper">Go to login</Link>
        </div>
      )}
      {(state === 'idle' || state === 'fail') && (
        <div>
          {state === 'fail' && <p className="mb-4 flex items-center gap-2 text-sm text-red-300"><XCircle size={16} /> That verification link is invalid or expired.</p>}
          <h1 className="font-display text-3xl tracking-tightest">Verify your email</h1>
          <p className="mt-2 text-sm text-smoke-300">Enter your brand account email to get a new verification link.</p>
          {resent ? (
            <p className="mt-4 text-sm text-ember-200">If an unverified account exists for that email, a new link is on its way.</p>
          ) : (
            <div className="mt-5 space-y-3">
              <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Recaptcha onToken={setCap} />
              <button onClick={resend} disabled={busy || !email} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-50">
                {busy ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Resend verification email'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function BrandVerifyPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <Suspense fallback={<Loader2 className="animate-spin text-ember-400" />}><VerifyInner /></Suspense>
    </div>
  );
}
