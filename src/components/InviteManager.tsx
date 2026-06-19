'use client';

import { useState } from 'react';
import { Mail, Link2, Loader2, Check, Copy } from 'lucide-react';
import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';
import { subscribeAuth } from '@/lib/auth';
import { useEffect } from 'react';

/** Admin: generate an invite link (prefills email; manual invites skip the
 *  verification email when accepted). */
export function InviteManager() {
  const [uuid, setUuid] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState<'consumer' | 'retailer'>('consumer');
  const [skip, setSkip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => subscribeAuth((s) => setUuid(s?.uuid ?? null)), []);

  async function create() {
    const addr = email.trim().toLowerCase();
    if (!addr) return setErr('Enter an email.');
    if (!isSupabaseConfigured) return setErr('Supabase not configured.');
    setBusy(true); setErr(''); setLink(''); setCopied(false);
    try {
      const token = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
      const { error } = await supabaseBrowser().from('invites').insert({
        token, email: addr, account_type: accountType, skip_verification: skip, created_by: uuid,
      });
      if (error) throw new Error(error.message);
      setLink(`${window.location.origin}/register?invite=${token}`);
      setEmail('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to create invite.'); }
    finally { setBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-smoke-300">Create an invite link. The signup page opens with the email prefilled; manual invites skip the verification email and sign the person in on accept.</p>

      <div>
        <label className="eyebrow mb-1 block">Email to invite</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="guest@email.com"
          className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-smoke-200">
          <span className="eyebrow mr-2">Account</span>
          <select value={accountType} onChange={(e) => setAccountType(e.target.value as 'consumer' | 'retailer')}
            className="rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-2 py-1.5 text-sm text-paper focus:border-ember-400 focus:outline-none">
            <option value="consumer">Aficionado</option>
            <option value="retailer">Retailer</option>
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-smoke-200">
          <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="accent-ember-400" />
          Skip verification email (manual invite)
        </label>
      </div>

      <button onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Create invite link
      </button>

      {link && (
        <div className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-smoke-400"><Link2 size={12} /> Share this link</div>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="flex-1 rounded-md border-[0.5px] border-ember-400/15 bg-ink/60 px-2 py-1.5 text-xs text-ember-100" />
            <button onClick={copy} className="inline-flex items-center gap-1 rounded-md border-[0.5px] border-ember-400/30 px-2.5 py-1.5 text-xs text-ember-100 hover:bg-ember-400/10">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-smoke-500">Send this to the invitee. Auto-emailing invites needs a mail provider — not wired yet.</p>
        </div>
      )}
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}
