'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { getMyBrands, changeBrandPassword, type MyBrand } from '@/lib/brands';
import { SecurityPanel } from '@/components/BrandDashboard';
import { SupportTicketForm } from '@/components/SupportTicketForm';
import { TeamSeats } from '@/components/TeamSeats';

export default function BrandSettingsPage() {
  const router = useRouter();
  const [brand, setBrand] = useState<MyBrand | null | undefined>(undefined);
  async function load() { const bs = await getMyBrands(); if (!bs.length) { router.replace('/brand/login'); return; } setBrand(bs[0]); }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (brand === undefined) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ember-400" /></div>;
  if (!brand) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 pt-10">
      <Link href="/brand" className="inline-flex items-center gap-1.5 text-xs text-smoke-400 hover:text-paper"><ArrowLeft size={14} /> Back to dashboard</Link>
      <h1 className="mt-2 font-display text-4xl tracking-tightest">Account settings</h1>
      <p className="mt-1 text-sm text-smoke-400">{brand.name} · {brand.email ?? ''}</p>

      <ChangePassword />
      <SecurityPanel mfaEnabled={!!brand.mfaEnabled} onChange={load} />
      <TeamSeats />
      <SupportTicketForm />

      <section className="mt-8">
        <p className="text-sm text-smoke-400">Edit your public brand profile, logo and posts from the <Link href="/brand" className="text-ember-400 underline">dashboard</Link>.</p>
      </section>
    </div>
  );
}

function ChangePassword() {
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  async function submit() {
    setErr(null); setMsg(null);
    if (next.length < 8) return setErr('New password must be at least 8 characters.');
    if (next !== confirm) return setErr('Passwords don’t match.');
    setBusy(true); const r = await changeBrandPassword(cur, next); setBusy(false);
    if (!r.ok) { setErr(r.error ?? 'Could not change password.'); return; }
    setMsg('Password updated.'); setCur(''); setNext(''); setConfirm('');
  }
  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><KeyRound size={18} className="text-ember-400" /> Password</h2>
      <div className="mt-3 space-y-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        <input className={input} type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <input className={input} type="password" placeholder="New password (8+ chars)" value={next} onChange={(e) => setNext(e.target.value)} />
        <input className={input} type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {err && <p className="text-sm text-red-300">{err}</p>}
        {msg && <p className="text-sm text-ember-200">{msg}</p>}
        <button onClick={submit} disabled={busy || !cur || !next} className="rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">{busy ? 'Saving…' : 'Update password'}</button>
      </div>
    </section>
  );
}
