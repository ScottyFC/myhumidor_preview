'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Store, Loader2, Check, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signUpEmail, signInEmail, signInOAuth, resendConfirmation, type AuthProvider } from '@/lib/auth';
import type { AccountType } from '@/lib/ids';

type Mode = 'signup' | 'signin';

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');
  const [type, setType] = useState<AccountType>('consumer');
  const [busy, setBusy] = useState<AuthProvider | null>(null);

  // manual fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loungeName, setLoungeName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Surfaced when a confirmation link is expired/already used (callback redirect).
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error')) {
      setLinkError(true);
      setMode('signin');
    }
  }, []);

  function finish() {
    router.push(type === 'lounge' ? '/dashboard' : '/humidor');
  }

  async function oauth(provider: AuthProvider) {
    if (provider === 'password') return;
    setError('');
    if (mode === 'signup' && !agreed) {
      return setError('Please agree to the terms to create an account.');
    }
    setBusy(provider);
    // REAL: redirects to the provider, then back to /auth/callback.
    // DEMO: creates a local session immediately.
    const { error } = await signInOAuth(provider, type);
    if (error) {
      setError(error);
      setBusy(null);
      return;
    }
    finish();
  }

  async function manual() {
    setError('');
    setLinkError(false);
    if (!email.trim()) return setError('Enter your email.');
    if (mode === 'signup') {
      if (password.length < 8) return setError('Password must be at least 8 characters.');
      if (password !== confirm) return setError('Passwords don’t match.');
      if (type === 'consumer' && !displayName.trim()) return setError('Choose a display name.');
      if (type === 'lounge' && !loungeName.trim()) return setError('Enter your lounge name.');
      if (!agreed) return setError('Please agree to the terms to create an account.');
    }
    setBusy('password');

    if (mode === 'signup') {
      const res = await signUpEmail({
        type,
        email: email.trim(),
        password,
        displayName:
          type === 'lounge' ? loungeName.trim() || 'Your Lounge' : displayName.trim() || 'You',
        loungeName: type === 'lounge' ? loungeName.trim() : undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
      });
      if (res.error) {
        setError(res.error);
        setBusy(null);
        return;
      }
      if (res.needsConfirmation) {
        setVerifyEmail(email.trim());
        setBusy(null);
        return;
      }
      finish();
    } else {
      const res = await signInEmail(email.trim(), password);
      if (res.error) {
        setError(res.error);
        setBusy(null);
        return;
      }
      finish();
    }
  }

  if (verifyEmail) {
    return <VerifyEmail email={verifyEmail} onBack={() => setVerifyEmail(null)} />;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 pb-20 pt-12">
      <div className="mb-8 text-center">
        <Image
          src="/myhumidor-logo.png"
          alt="MyHumidor by CigarTV"
          width={3472}
          height={2100}
          className="mx-auto h-16 w-auto rounded-lg"
        />
        <h1 className="font-display mt-5 text-4xl tracking-tightest">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-smoke-300">
          {mode === 'signup'
            ? 'Track cigars, build your humidor, and discover what’s next.'
            : 'Sign in to your humidor or lounge dashboard.'}
        </p>
      </div>

      {linkError && (
        <div className="mb-5 rounded-md border-[0.5px] border-red-400/40 bg-red-400/5 px-3 py-2.5 text-xs text-red-300">
          That confirmation link expired or was already used. Sign in below, or sign up again to get
          a fresh link.
        </div>
      )}

      {/* Account type toggle (sign-up only) */}
      {mode === 'signup' && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <TypeCard
            active={type === 'consumer'}
            onClick={() => setType('consumer')}
            icon={<User size={18} strokeWidth={1.5} />}
            title="Cigar lover"
            sub="Rate, collect, discover"
          />
          <TypeCard
            active={type === 'lounge'}
            onClick={() => setType('lounge')}
            icon={<Store size={18} strokeWidth={1.5} />}
            title="Lounge / shop"
            sub="Menu, TV stick, credits"
          />
        </div>
      )}

      {/* OAuth */}
      <div className="space-y-2.5">
        <button
          onClick={() => oauth('google')}
          disabled={!!busy}
          className="flex w-full items-center justify-center gap-3 rounded-md border-[0.5px] border-ember-400/25 bg-char/60 py-2.5 text-sm font-medium transition hover:bg-ember-400/10 disabled:opacity-60"
        >
          {busy === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleMark />}
          Continue with Google
        </button>
        <button
          onClick={() => oauth('apple')}
          disabled={!!busy}
          className="flex w-full items-center justify-center gap-3 rounded-md border-[0.5px] border-ember-400/25 bg-char/60 py-2.5 text-sm font-medium transition hover:bg-ember-400/10 disabled:opacity-60"
        >
          {busy === 'apple' ? <Loader2 size={16} className="animate-spin" /> : <AppleMark />}
          Continue with Apple
        </button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-smoke-400">
        <span className="h-px flex-1 bg-ember-400/15" />
        or {mode === 'signup' ? 'sign up' : 'sign in'} with email
        <span className="h-px flex-1 bg-ember-400/15" />
      </div>

      {/* Manual */}
      <div className="space-y-3">
        {mode === 'signup' && type === 'consumer' && (
          <Input label="Display name" value={displayName} onChange={setDisplayName} placeholder="Sean" />
        )}
        {mode === 'signup' && type === 'lounge' && (
          <>
            <Input label="Lounge name" value={loungeName} onChange={setLoungeName} placeholder="Corona Cigar Co." />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={city} onChange={setCity} placeholder="Tampa" />
              <Input label="State" value={state} onChange={setState} placeholder="FL" />
            </div>
          </>
        )}
        <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@email.com" />
        <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        {mode === 'signup' && (
          <Input label="Confirm password" value={confirm} onChange={setConfirm} type="password" placeholder="••••••••" />
        )}

        {error && <div className="text-xs text-red-400">{error}</div>}

        {mode === 'signup' && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border-[0.5px] border-ember-400/20 bg-char/40 p-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-ember-400"
            />
            <span className="text-xs leading-relaxed text-smoke-300">
              I agree to the{' '}
              <Link href="/terms" className="text-ember-100 underline-offset-2 hover:underline">
                Terms &amp; Conditions
              </Link>{' '}
              and consent to MyHumidor storing and tracking my account data (ratings, humidor, and
              activity) to power the app. I&apos;m 21 or older.
            </span>
          </label>
        )}

        <button
          onClick={manual}
          disabled={!!busy || (mode === 'signup' && !agreed)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-ember-400 py-2.5 text-sm font-medium text-paper transition hover:bg-ember-600 disabled:opacity-60"
        >
          {busy === 'password' ? <Loader2 size={16} className="animate-spin" /> : <Check size={15} strokeWidth={2} />}
          {mode === 'signup'
            ? type === 'lounge'
              ? 'Create lounge account'
              : 'Create account'
            : 'Sign in'}
        </button>
      </div>

      <div className="mt-6 text-center text-sm text-smoke-300">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <button onClick={() => setMode('signin')} className="text-ember-100 hover:underline">
              Sign in
            </button>
          </>
        ) : (
          <>
            New here?{' '}
            <button onClick={() => setMode('signup')} className="text-ember-100 hover:underline">
              Create an account
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-smoke-400">
        By continuing you agree to the CigarTV terms. You must be 21+ to use MyHumidor.
        <br />
        <Link href="/" className="text-smoke-300 hover:text-paper">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

function VerifyEmail({ email, onBack }: { email: string; onBack: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setSending(true);
    await resendConfirmation(email);
    setSending(false);
    setSent(true);
    setCooldown(30);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 pb-20 pt-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ember-400/15">
        <MailCheck size={30} strokeWidth={1.5} className="text-ember-400" />
      </div>
      <h1 className="font-display mt-5 text-3xl tracking-tightest">Verify your email</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-smoke-200">
        We sent a confirmation link to <span className="text-paper">{email}</span>. Click it to
        activate your account, then you&apos;re in.
      </p>
      <p className="mx-auto mt-2 max-w-sm text-xs text-smoke-400">
        Check your spam folder if it&apos;s not in your inbox within a minute.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3">
        <button
          onClick={resend}
          disabled={sending || cooldown > 0}
          className="inline-flex items-center gap-2 rounded-md bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ember-600 disabled:opacity-50"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <MailCheck size={15} strokeWidth={1.5} />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
        </button>
        {sent && cooldown > 0 && (
          <span className="text-xs text-ember-100">Sent — check your inbox.</span>
        )}
        <button onClick={onBack} className="text-sm text-smoke-300 hover:text-paper">
          ← Use a different email
        </button>
      </div>
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg border-[0.5px] p-4 text-left transition',
        active
          ? 'border-ember-400 bg-ember-400/10'
          : 'border-ember-400/20 hover:border-ember-400/40'
      )}
    >
      <span className={cn('inline-flex', active ? 'text-ember-400' : 'text-smoke-300')}>{icon}</span>
      <div className="mt-2 font-display text-base font-medium">{title}</div>
      <div className="text-xs text-smoke-400">{sub}</div>
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C41.4 36.4 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 1.43c0 1.14-.42 2.27-1.25 3.09-.83.83-2.18 1.46-3.31 1.37-.13-1.1.42-2.27 1.2-3.02.86-.84 2.34-1.46 3.36-1.44zM20.9 17.3c-.55 1.28-.82 1.85-1.53 2.98-.99 1.58-2.39 3.55-4.12 3.56-1.54.01-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.79-4.04-3.37C.39 16.04.09 10.9 1.89 8.18c1.28-1.93 3.3-3.06 5.2-3.06 1.94 0 3.16 1.06 4.76 1.06 1.55 0 2.5-1.06 4.74-1.06 1.7 0 3.5.93 4.78 2.53-4.2 2.3-3.51 8.3.53 9.65z" />
    </svg>
  );
}
