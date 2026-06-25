'use client';
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { Loader2, Ticket, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { listMyPreorders, cancelMyPreorder, type MyPreorder } from '@/lib/preorders';

const TONE: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  pending: { label: 'Awaiting approval', cls: 'text-ember-300', Icon: Clock },
  approved: { label: 'Confirmed — ready for pickup', cls: 'text-emerald-300', Icon: CheckCircle2 },
  fulfilled: { label: 'Picked up', cls: 'text-smoke-400', Icon: CheckCircle2 },
  declined: { label: 'Declined', cls: 'text-red-300', Icon: XCircle },
  cancelled: { label: 'Cancelled', cls: 'text-smoke-400', Icon: XCircle },
  expired: { label: 'Expired (hold released)', cls: 'text-smoke-400', Icon: XCircle },
};
const ACTIVE = ['pending', 'approved'];

function Qr({ token }: { token: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(token, { margin: 1, width: 320, color: { dark: '#14110d', light: '#f0c355' } }).then(setSrc).catch(() => {}); }, [token]);
  if (!src) return <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-char/60"><Loader2 className="animate-spin text-ember-400" /></div>;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt="Pre-order QR" className="h-44 w-44 rounded-xl" />;
}

function Row({ p, onCancel }: { p: MyPreorder; onCancel: (id: string) => void }) {
  const t = TONE[p.status] ?? TONE.pending;
  // Approved orders start expanded (the QR is the point); everything else collapsed.
  const [open, setOpen] = useState(p.status === 'approved');
  const [busy, setBusy] = useState(false);
  const canCancel = ACTIVE.includes(p.status);

  async function cancel() {
    if (!confirm('Cancel this pre-order? Repeated cancellations can temporarily suspend pre-ordering.')) return;
    setBusy(true); await cancelMyPreorder(p.id); setBusy(false); onCancel(p.id);
  }

  return (
    <div className="overflow-hidden rounded-2xl border-[0.5px] border-ember-400/15 bg-char/30">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <div className="truncate font-display text-lg text-paper">{p.cigar_name}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {p.lounges && <span className="text-ember-300">{p.lounges.name}</span>}
            <span className={`inline-flex items-center gap-1 ${t.cls}`}><t.Icon size={12} /> {t.label}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {p.status === 'approved' && <span className="font-display tracking-wide text-ember-100">{p.confirmation_number}</span>}
          {open ? <ChevronUp size={16} className="text-smoke-400" /> : <ChevronDown size={16} className="text-smoke-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t-[0.5px] border-ember-400/10 px-4 pb-4 pt-3">
          {p.status === 'approved' ? (
            <div className="flex flex-col items-center gap-3">
              <Qr token={p.qr_token} />
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-smoke-500">Confirmation</div>
                <div className="font-display text-2xl tracking-wide text-ember-100">{p.confirmation_number}</div>
                <p className="mt-1 text-xs text-smoke-400">Show this at the lounge to pick up your reservation{p.quantity > 1 ? ` (×${p.quantity})` : ''}.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-smoke-300">
              {p.status === 'pending' && 'The lounge will confirm your reservation soon — your QR code will appear here once approved.'}
              {p.status === 'fulfilled' && `Picked up · ${p.confirmation_number}`}
              {p.status === 'expired' && 'The hold window passed and this reservation was released back to inventory.'}
              {(p.status === 'declined' || p.status === 'cancelled') && 'This reservation is no longer active.'}
            </p>
          )}
          {p.lounge_message && (p.status === 'declined' || p.status === 'cancelled') && (
            <p className="mt-2 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-2.5 text-xs text-smoke-300"><span className="text-smoke-500">Message from the lounge: </span>{p.lounge_message}</p>
          )}
          {canCancel && (
            <button onClick={cancel} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border-[0.5px] border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-50">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Cancel pre-order
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MyPreorders() {
  const [rows, setRows] = useState<MyPreorder[] | null>(null);
  const [showPrev, setShowPrev] = useState(false);
  const load = useCallback(() => { listMyPreorders().then((r) => setRows(r.preorders ?? [])); }, []);
  useEffect(() => { load(); }, [load]);

  if (rows === null) return <div className="flex items-center gap-2 text-sm text-smoke-300"><Loader2 size={14} className="animate-spin text-ember-400" /> Loading…</div>;
  if (rows.length === 0) return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-6 text-center">
      <Ticket size={22} className="mx-auto text-ember-400" />
      <p className="mt-2 text-sm text-smoke-300">No pre-orders yet. Reserve upcoming releases from a lounge’s page.</p>
      <Link href="/search" className="mt-3 inline-block text-sm text-ember-300 hover:underline">Find a lounge</Link>
    </div>
  );

  const active = rows.filter((p) => ACTIVE.includes(p.status));
  const previous = rows.filter((p) => !ACTIVE.includes(p.status));

  return (
    <div className="space-y-3">
      {active.length === 0 && <p className="text-sm text-smoke-400">No active pre-orders right now.</p>}
      {active.map((p) => <Row key={p.id} p={p} onCancel={load} />)}

      {previous.length > 0 && (
        <div className="pt-2">
          <button onClick={() => setShowPrev((v) => !v)} className="flex items-center gap-2 text-sm text-smoke-300 hover:text-paper">
            <History size={14} className="text-ember-400" /> Previous orders ({previous.length}) {showPrev ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showPrev && <div className="mt-3 space-y-3">{previous.map((p) => <Row key={p.id} p={p} onCancel={load} />)}</div>}
        </div>
      )}
    </div>
  );
}
