'use client';

import { useState } from 'react';
import { Megaphone, Loader2, Check } from 'lucide-react';
import { broadcastNotification } from '@/lib/notifications';

/** Admin: push a system-wide notification to every member's bell. */
export function SystemNotify() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState('');

  async function send() {
    const title = msg.trim();
    if (!title) return;
    if (!confirm(`Send this to every member?\n\n“${title}”`)) return;
    setBusy(true); setErr(''); setResult(null);
    try {
      const n = await broadcastNotification(title);
      setResult(`Sent to ${n} member${n === 1 ? '' : 's'}.`);
      setMsg('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to send.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="mb-3 text-sm text-smoke-300">
        Send an announcement to every member. It appears in their notification bell immediately
        (and as a push once device delivery is configured).
      </p>
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={3}
        maxLength={280}
        placeholder="e.g. New Padrón releases just landed — check the Top Rated list."
        className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={send} disabled={busy || !msg.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Megaphone size={13} strokeWidth={1.75} />} Send to all members
        </button>
        <span className="text-[11px] text-smoke-500">{msg.length}/280</span>
        {result && <span className="inline-flex items-center gap-1 text-xs text-ember-100"><Check size={12} strokeWidth={2} /> {result}</span>}
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}
