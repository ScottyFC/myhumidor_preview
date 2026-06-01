'use client';

import { useState } from 'react';
import { Flag, Check, Loader2, Send } from 'lucide-react';
import { addChangeRequest } from '@/lib/change-requests';
import { cn } from '@/lib/utils';

export function ChangeRequest({
  targetType,
  targetId,
  targetName,
}: {
  targetType: 'cigar' | 'lounge';
  targetId: string;
  targetName: string;
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!msg.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    addChangeRequest({ targetType, targetId, targetName, message: msg.trim() });
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-lg border-[0.5px] border-ember-400/25 bg-ember-400/5 p-4 text-sm text-ember-100">
        <Check size={15} strokeWidth={2} className="mr-1.5 inline" />
        Thank you! We&apos;ll take a look. You&apos;re helping build something good. 🌱
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-smoke-400 transition hover:text-ember-100"
      >
        <Flag size={12} strokeWidth={1.5} />
        Spot something off? Suggest a fix — we&apos;re new here, so anything helps.
      </button>
    );
  }

  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 p-4">
      <div className="eyebrow mb-2">Suggest a correction</div>
      <p className="mb-3 text-xs text-smoke-400">
        Wrong price, size, spelling, or anything else about <span className="text-smoke-200">{targetName}</span>?
        Tell us — we&apos;re new here and every fix helps. 🙏
      </p>
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={3}
        placeholder="e.g. The wrapper is listed wrong — it's a Maduro, not Connecticut."
        className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={!msg.trim() || busy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition',
            msg.trim() && !busy ? 'bg-ember-400 text-paper hover:bg-ember-600' : 'bg-smoke-800 text-smoke-400'
          )}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.5} />}
          Submit
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-smoke-400 hover:text-paper">
          Cancel
        </button>
      </div>
    </div>
  );
}
