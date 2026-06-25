'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { Loader2, Ticket, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { listMyPreorders, type MyPreorder } from '@/lib/preorders';

const TONE: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  pending: { label: 'Awaiting approval', cls: 'text-ember-300', Icon: Clock },
  approved: { label: 'Confirmed — ready for pickup', cls: 'text-emerald-300', Icon: CheckCircle2 },
  fulfilled: { label: 'Picked up', cls: 'text-smoke-400', Icon: CheckCircle2 },
  declined: { label: 'Declined', cls: 'text-red-300', Icon: XCircle },
  cancelled: { label: 'Cancelled', cls: 'text-smoke-400', Icon: XCircle },
};

function Qr({ token }: { token: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(token, { margin: 1, width: 320, color: { dark: '#14110d', light: '#f0c355' } }).then(setSrc).catch(() => {}); }, [token]);
  if (!src) return <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-char/60"><Loader2 className="animate-spin text-ember-400" /></div>;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt="Pre-order QR" className="h-44 w-44 rounded-xl" />;
}

export function MyPreorders() {
  const [rows, setRows] = useState<MyPreorder[] | null>(null);
  useEffect(() => { listMyPreorders().then((r) => setRows(r.preorders ?? [])); }, []);

  if (rows === null) return <div className="flex items-center gap-2 text-sm text-smoke-300"><Loader2 size={14} className="animate-spin text-ember-400" /> Loading…</div>;
  if (rows.length === 0) return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-6 text-center">
      <Ticket size={22} className="mx-auto text-ember-400" />
      <p className="mt-2 text-sm text-smoke-300">No pre-orders yet. Reserve upcoming releases from a lounge’s page.</p>
      <Link href="/search" className="mt-3 inline-block text-sm text-ember-300 hover:underline">Find a lounge</Link>
    </div>
  );

  return (
    <div className="space-y-4">
      {rows.map((p) => {
        const t = TONE[p.status] ?? TONE.pending;
        return (
          <div key={p.id} className="overflow-hidden rounded-2xl border-[0.5px] border-ember-400/15 bg-char/30">
            <div className="flex items-center justify-between gap-3 border-b-[0.5px] border-ember-400/10 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-display text-lg text-paper">{p.cigar_name}</div>
                {p.lounges && <Link href={`/lounges/${p.lounges.slug}`} className="text-xs text-ember-300 hover:underline">{p.lounges.name}</Link>}
              </div>
              <span className={`inline-flex items-center gap-1 text-xs ${t.cls}`}><t.Icon size={13} /> {t.label}</span>
            </div>
            {p.status === 'approved' ? (
              <div className="flex flex-col items-center gap-3 p-5">
                <Qr token={p.qr_token} />
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wide text-smoke-500">Confirmation</div>
                  <div className="font-display text-2xl tracking-wide text-ember-100">{p.confirmation_number}</div>
                  <p className="mt-1 text-xs text-smoke-400">Show this at the lounge to pick up your reservation{p.quantity > 1 ? ` (×${p.quantity})` : ''}.</p>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-smoke-300">
                {p.status === 'pending' && 'The lounge will confirm your reservation soon — your QR code will appear here once approved.'}
                {p.status === 'fulfilled' && `Picked up · ${p.confirmation_number}`}
                {(p.status === 'declined' || p.status === 'cancelled') && 'This reservation is no longer active.'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
