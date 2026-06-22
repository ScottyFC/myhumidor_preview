'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ScanFace, User, Store, Loader2, Check, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signUpEmail, signInEmail, resendConfirmation, type AuthProvider } from '@/lib/auth';
import { biometricAvailable, hasBiometricCredentials, saveBiometricCredentials, biometricSignIn, type BiometryInfo } from '@/lib/biometric';
import { Recaptcha } from '@/components/Recaptcha';
import type { AccountType } from '@/lib/ids';

type Mode = 'signup' | 'signin';

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [type, setType] = useState<AccountType>('consumer');
  const [claimSlug, setClaimSlug] = useState<string | null>(null);
  const [busy, setBusy] = useState<AuthProvider | null>(null);

  // manual fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [bio, setBio] = useState<BiometryInfo>({ available: false, type: null });
  const [bioHasCreds, setBioHasCreds] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loungeName, setLoungeName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [ownsMultiple, setOwnsMultiple] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteSkip, setInviteSkip] = useState(false);
  const [invited, setInvited] = useState(false);

  // Surfaced when a confirmation link is expired/already used (callback redirect).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('error')) { setLinkError(true); setMode('signin'); }
    if (q.get('mode') === 'signup') setMode('signup');
    biometricAvailable().then((b) => { setBio(b); if (b.available) hasBiometricCredentials().then(setBioHasCreds); });
    const prefEmail = q.get('email'); if (prefEmail) setEmail(prefEmail);
    const inv = q.get('invite');
    if (inv) {
      setMode('signup');
      fetch(`/api/invite/${inv}`).then((r) => r.json()).then((d) => {
        if (d?.valid) {
          setInviteToken(inv); setInviteSkip(!!d.skipVerification); setInvited(true);
          if (d.email) setEmail(d.email);
          if (d.accountType === 'retailer') setType('retailer');
        }
      }).catch(() => {});
    }
    // Retailer signup deep-links (claim/submit flows) preselect the retailer tab.
    if (q.get('type') === 'retailer' || q.get('type') === 'lounge') { setType('retailer'); setMode('signup'); }
    const claim = q.get('claim');
    if (claim) { setClaimSlug(claim); setType('retailer'); setMode('signup'); }
  }, []);

  function finish(signup = false) {
    if (claimSlug) { router.push(`/lounges/${claimSlug}`); return; }
    // Retailer signup flows straight into plans/certification (one process);
    // returning retailers go to their dashboard.
    if (type === 'retailer') { router.push(signup ? '/verify' : '/dashboard'); return; }
    router.push('/humidor');
  }

  async function manual() {
    setError('');
    setLinkError(false);
    if (!email.trim()) return setError('Enter your email.');
    if (mode === 'signup') {
      if (password.length < 8) return setError('Password must be at least 8 characters.');
      if (password !== confirm) return setError('Passwords don’t match.');
      if (type === 'consumer' && !displayName.trim()) return setError('Choose a display name.');
      if (type === 'retailer' && !loungeName.trim()) return setError('Enter your lounge name.');
      if (!agreed) return setError('Please agree to the terms to create an account.');
      if (!captchaToken) return setError('Please complete the “I’m not a robot” check.');
    }
    setBusy('password');

    if (mode === 'signup') {
      // Verify the reCAPTCHA server-side before creating the account.
      try {
        const v = await fetch('/api/recaptcha/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: captchaToken }),
        }).then((r) => r.json());
        if (!v.ok) { setBusy(null); return setError('reCAPTCHA check failed. Please try again.'); }
      } catch { /* network issue — let signup proceed rather than hard-block */ }

      const res = await signUpEmail({
        type,
        email: email.trim(),
        password,
        displayName:
          type === 'retailer' ? loungeName.trim() || 'Your Lounge' : displayName.trim() || 'You',
        loungeName: type === 'retailer' ? loungeName.trim() : undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        ownsMultiple: type === 'retailer' ? ownsMultiple : undefined,
      });
      if (res.error) {
        setError(res.error);
        setBusy(null);
        return;
      }
      // Invited (manual) users skip the verification email: confirm them and
      // sign them straight in.
      if (inviteToken && inviteSkip && res.userId) {
        try {
          const accept = await fetch('/api/invite/accept', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteToken, userId: res.userId }),
          }).then((r) => r.json());
          if (accept?.ok && accept?.confirmed) {
            const signin = await signInEmail(email.trim(), password);
            if (!signin.error) { finish(true); return; }
          }
        } catch { /* fall through to normal confirmation */ }
      }
      if (res.needsConfirmation) {
        setVerifyEmail(email.trim());
        setBusy(null);
        return;
      }
      finish(true);
    } else {
      const res = await signInEmail(email.trim(), password, remember);
      if (res.error) {
        setError(res.error);
        setBusy(null);
        return;
      }
      if (enableBiometric && bio.available) { try { await saveBiometricCredentials(email.trim(), password); } catch { /* ignore */ } }
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
        {invited && (
          <p className="mx-auto mt-3 inline-block rounded-full border-[0.5px] border-ember-400/30 bg-ember-400/10 px-3 py-1 text-xs text-ember-100">
            You’ve been invited{inviteSkip ? ' — no email confirmation needed' : ''}. Just set a password to finish.
          </p>
        )}
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
            title="Cigar Aficionado"
            sub="Rate, collect, discover"
          />
          <TypeCard
            active={type === 'retailer'}
            onClick={() => setType('retailer')}
            icon={<Store size={18} strokeWidth={1.5} />}
            title="Retailer"
            sub="Manage inventory & posts"
          />
        </div>
      )}

      {/* Manual */}
      <div className="space-y-3">
        {mode === 'signup' && type === 'consumer' && (
          <Input label="Display name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
        )}
        {mode === 'signup' && type === 'retailer' && (
          <>
            <p className="rounded-md border-[0.5px] border-ember-400/20 bg-ember-400/5 px-3 py-2 text-xs text-smoke-200">
              A retailer account is for businesses — it’s separate from a member account, doesn’t appear on the members
              list, and is required to claim or submit a lounge.
            </p>
            <Input label="Lounge name" value={loungeName} onChange={setLoungeName} placeholder="Your lounge’s name" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={city} onChange={setCity} placeholder="Tampa" />
              <Input label="State" value={state} onChange={setState} placeholder="FL" />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border-[0.5px] border-ember-400/20 bg-char/40 p-3">
              <input type="checkbox" checked={ownsMultiple} onChange={(e) => setOwnsMultiple(e.target.checked)} className="mt-0.5 accent-ember-400" />
              <span className="text-xs text-smoke-200">I own multiple lounges. <span className="text-smoke-400">You can add and assign your other locations later from your dashboard.</span></span>
            </label>
          </>
        )}
        <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@email.com" />
        <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        {mode === 'signup' && (
          <Input label="Confirm password" value={confirm} onChange={setConfirm} type="password" placeholder="••••••••" />
        )}
        {mode === 'signup' && (
          <Recaptcha onToken={setCaptchaToken} />
        )}
        {mode === 'signin' && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-smoke-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-ember-400" />
            Remember me on this device
          </label>
        )}
        {mode === 'signin' && bio.available && !bioHasCreds && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-smoke-300">
            <input type="checkbox" checked={enableBiometric} onChange={(e) => setEnableBiometric(e.target.checked)} className="accent-ember-400" />
            <ScanFace size={13} className="text-ember-400" /> Enable {bio.type === 'face' ? 'Face ID' : bio.type === 'fingerprint' ? 'fingerprint' : 'biometric'} sign-in
          </label>
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
            ? type === 'retailer'
              ? 'Create lounge account'
              : 'Create account'
            : 'Sign in'}
        </button>

        {mode === 'signin' && bio.available && bioHasCreds && (
          <button
            onClick={async () => {
              setError(''); setBusy('password');
              const res = await biometricSignIn();
              if (res.error) { setError(res.error); setBusy(null); return; }
              finish();
            }}
            disabled={!!busy}
            className="flex w-full items-center justify-center gap-2 rounded-md border-[0.5px] border-ember-400/40 py-2.5 text-sm font-medium text-ember-100 transition hover:bg-ember-400/10 disabled:opacity-60"
          >
            <ScanFace size={16} strokeWidth={1.75} /> Sign in with {bio.type === 'face' ? 'Face ID' : bio.type === 'fingerprint' ? 'fingerprint' : 'biometrics'}
          </button>
        )}
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


