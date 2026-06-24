'use client';
import { useState } from 'react';
import { Loader2, LifeBuoy } from 'lucide-react';
import { submitSupportTicket } from '@/lib/brands';

export function SupportTicketForm() {
  const [subject, setSubject] = useState(''); const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit() {
    setErr(null); setBusy(true);
    const r = await submitSupportTicket(subject.trim(), body.trim()); setBusy(false);
    if (!r.ok) { setErr(r.error ?? 'Could not submit.'); return; }
    setDone(true); setSubject(''); setBody('');
  }
  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><LifeBuoy size={18} className="text-ember-400" /> Support</h2>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        {done ? (
          <p className="text-sm text-smoke-200">Thanks — your ticket is in. We’ll follow up by email. <button onClick={() => setDone(false)} className="text-ember-400 underline">Submit another</button></p>
        ) : (
          <div className="space-y-3">
            <input className={input} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className={input + ' min-h-[110px]'} placeholder="How can we help?" value={body} onChange={(e) => setBody(e.target.value)} />
            {err && <p className="text-sm text-red-300">{err}</p>}
            <button onClick={submit} disabled={busy || !subject || !body} className="inline-flex items-center gap-2 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
              {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : 'Submit ticket'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
