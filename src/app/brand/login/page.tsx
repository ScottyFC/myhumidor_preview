'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Building2 } from 'lucide-react';
import { Recaptcha } from '@/components/Recaptcha';

export default function BrandLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function login() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/brand-auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken: token }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setErr(j.error ?? 'Login failed.'); setBusy(false); return; }
      location.href = '/brand';
    } catch { setErr('Network error.'); setBusy(false); }
  }

  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <div className="mb-2 flex items-center gap-2 eyebrow"><Building2 size={14} className="text-ember-400" /> Brand portal</div>
      <h1 className="font-display text-4xl tracking-tightest">Brand login</h1>
      <p className="mt-2 text-sm text-smoke-300">Sign in to manage your brand. This is separate from your consumer account.</p>

      <div className="mt-6 space-y-3">
        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') login(); }} />
        <Recaptcha onToken={setToken} />
        {err && <p className="text-sm text-red-300">{err}</p>}
        <button onClick={login} disabled={busy || !email || !password} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-50">
          {busy ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign in'}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-smoke-400">
        <Link href="/brand/forgot" className="text-ember-400 underline">Forgot password?</Link><br/>
        Don’t have a brand account? <Link href="/for-brands" className="text-ember-400 underline">Apply here</Link>.
      </p>
    </div>
  );
}
