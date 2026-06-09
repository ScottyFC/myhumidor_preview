'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Loader2, Check, Lock, KeyRound } from 'lucide-react';
import { subscribeAuth, type Session } from '@/lib/auth';
import { amMemberOf, submitClaim } from '@/lib/lounges-owner';
import { ChangeRequest } from '@/components/ChangeRequest';

/**
 * Decides what a viewer sees on a lounge page:
 *  - owner/member → nothing here (they have the post composer).
 *  - CERTIFIED    → nothing (locked; certification is the paid tier).
 *  - VERIFIED     → a change request (free tier owners correct their listing).
 *  - otherwise    → a "Claim this lounge" CTA, which requires a RETAILER account.
 *                   Regular users / signed-out visitors are prompted to make one.
 */
export function LoungeClaimBlock({
  slug, name, verified, certified,
}: { slug: string; loungeId: string; name: string; verified: boolean; certified: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [owner, setOwner] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => subscribeAuth(setSession), []);
  useEffect(() => {
    let off = false;
    amMemberOf(slug).then((v) => { if (!off) { setOwner(v); setReady(true); } });
    return () => { off = true; };
  }, [slug]);

  if (!ready) return null;
  if (owner) return null;                         // owners manage via the composer
  if (certified) return null;                     // certified lounges can't be claimed

  // Verified (free tier): allow corrections via a change request.
  if (verified) {
    return <ChangeRequest targetType="lounge" targetId={slug} targetName={name} />;
  }

  // Unclaimed listing → claim flow, gated to retailer accounts.
  const isRetailer = session?.type === 'lounge';
  if (!isRetailer) {
    return (
      <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/40 p-6">
        <div className="flex items-center gap-2">
          <KeyRound size={18} strokeWidth={1.5} className="text-ember-400" />
          <div className="font-display text-lg">Own {name}?</div>
        </div>
        <p className="mt-2 max-w-xl text-sm text-smoke-200">
          Claiming a lounge requires a <span className="text-ember-100">retailer account</span> — separate from a
          regular member account. Create one to claim this listing and manage it.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={`/register?type=lounge&claim=${encodeURIComponent(slug)}`} className="btn-primary text-xs">
            Create a retailer account
          </Link>
          {session && session.type !== 'lounge' && (
            <span className="text-xs text-smoke-400">You’re signed in as a member — claiming needs a retailer account.</span>
          )}
        </div>
      </div>
    );
  }

  return <ClaimForm slug={slug} name={name} defaultName={session?.displayName ?? ''} />;
}

function ClaimForm({ slug, name, defaultName }: { slug: string; name: string; defaultName: string }) {
  const [claimant, setClaimant] = useState(defaultName);
  const [role, setRole] = useState('Owner');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function claim() {
    if (!claimant.trim() || !email.trim()) return setErr('Add your name and a contact email.');
    setBusy(true); setErr('');
    const ok = await submitClaim({
      loungeSlug: slug, loungeName: name, claimantName: claimant.trim(),
      roleRequested: role, email: email.trim(), phone: phone.trim() || undefined,
    });
    setBusy(false);
    if (ok) setDone(true);
    else setErr('Could not submit the claim. Please try again.');
  }

  if (done) {
    return (
      <div className="rounded-xl border-[0.5px] border-ember-400/30 bg-ember-400/5 p-6">
        <div className="flex items-center gap-2"><Check size={18} className="text-ember-400" /><div className="font-display text-lg">Claim submitted</div></div>
        <p className="mt-2 text-sm text-smoke-200">Our team will review your claim. Once approved, you can verify {name} from your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/40 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} strokeWidth={1.5} className="text-ember-400" />
        <div className="font-display text-lg">Claim {name}</div>
      </div>
      <p className="mt-2 max-w-xl text-sm text-smoke-200">
        Submit your claim for admin review. Once approved, you’ll be able to verify the lounge.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Your name" v={claimant} on={setClaimant} />
        <Field label="Your role" v={role} on={setRole} placeholder="Owner / Manager" />
        <Field label="Contact email" v={email} on={setEmail} placeholder="you@lounge.com" />
        <Field label="Phone (optional)" v={phone} on={setPhone} />
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      <button onClick={claim} disabled={busy} className="btn-primary mt-4 text-xs">
        {busy ? <Loader2 size={14} className="animate-spin" /> : 'Submit claim'}
      </button>
    </div>
  );
}

function Field({ label, v, on, placeholder }: { label: string; v: string; on: (s: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-smoke-400">{label}</label>
      <input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder}
        className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
    </div>
  );
}
