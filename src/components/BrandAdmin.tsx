'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Gem, Send, Inbox, Boxes, MessageSquare, LifeBuoy, CreditCard } from 'lucide-react';
import { BrandSignupQueue } from '@/components/BrandSignupQueue';
import {
  listApprovedBrands, setSubscriptionStatus, setPaymentMethod, createInvoice,
  listReviewRequests, updateReviewStatus, listSupportTickets, updateTicketStatus,
  type ApprovedBrandRow, type ReviewReqRow, type TicketRow,
} from '@/lib/brands';

type Sub = 'apps' | 'brands' | 'reviews' | 'tickets';
const STATUSES = [['awaiting', 'Awaiting Response'], ['in_progress', 'In Progress'], ['done', 'Done']] as const;
const money = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'usd' });

function Diamond() { return <Gem size={13} className="text-ember-400" aria-label="Premium" />; }
function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 px-2 py-1 text-xs text-paper focus:outline-none">
      {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function BrandAdmin() {
  const [sub, setSub] = useState<Sub>('apps');
  const subs: { id: Sub; label: string; icon: typeof Inbox }[] = [
    { id: 'apps', label: 'Applications', icon: Boxes },
    { id: 'brands', label: 'Brands & billing', icon: CreditCard },
    { id: 'reviews', label: 'CigarTV reviews', icon: MessageSquare },
    { id: 'tickets', label: 'Support tickets', icon: LifeBuoy },
  ];
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {subs.map((s) => { const I = s.icon; return (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${sub === s.id ? 'bg-ember-400/15 text-ember-100' : 'text-smoke-300 hover:text-paper'}`}>
            <I size={14} /> {s.label}
          </button>
        ); })}
      </div>
      {sub === 'apps' && <BrandSignupQueue />}
      {sub === 'brands' && <BrandsBilling />}
      {sub === 'reviews' && <ReviewQueue />}
      {sub === 'tickets' && <TicketQueue />}
    </div>
  );
}

function BrandsBilling() {
  const [rows, setRows] = useState<ApprovedBrandRow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => setRows(await listApprovedBrands()), []);
  useEffect(() => { load(); }, [load]);
  if (!rows) return <Loader2 className="animate-spin text-ember-400" />;
  if (!rows.length) return <p className="text-sm text-smoke-400">No approved brands yet.</p>;
  return (
    <div className="space-y-3">
      {msg && <p className="text-sm text-ember-200">{msg}</p>}
      {rows.map((b) => <BrandBillingCard key={b.brandId} b={b} onChange={load} setMsg={setMsg} />)}
    </div>
  );
}

function BrandBillingCard({ b, onChange, setMsg }: { b: ApprovedBrandRow; onChange: () => void; setMsg: (s: string) => void }) {
  const premium = b.tier === 'premium';
  const [pm, setPm] = useState(b.paymentMethod ?? '');
  const [amount, setAmount] = useState(premium ? (b.contractAmountCents ? String(b.contractAmountCents / 100) : '') : '300');
  const [desc, setDesc] = useState('');
  const [period, setPeriod] = useState('');
  const [busy, setBusy] = useState(false);

  async function activate() { setBusy(true); await setSubscriptionStatus(b.brandId, 'active', amount ? Math.round(Number(amount) * 100) : undefined); setBusy(false); setMsg(`${b.name} subscription set to active.`); onChange(); }
  async function savePm() { setBusy(true); await setPaymentMethod(b.brandId, pm); setBusy(false); setMsg(`Payment method saved for ${b.name}.`); }
  async function invoice(send: boolean) {
    const cents = Math.round(Number(amount) * 100);
    if (!cents) { setMsg('Enter an amount.'); return; }
    setBusy(true);
    const r = await createInvoice({ brandId: b.brandId, amountCents: cents, description: desc || undefined, period: period || undefined, send });
    setBusy(false);
    setMsg(r.ok ? (send ? (r.emailed ? `Invoice sent to ${b.contactEmail}.` : 'Invoice created & marked sent (email not delivered — check email setup).') : 'Draft invoice saved.') : (r.error ?? 'Failed.'));
  }
  const input = 'rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 px-2.5 py-1.5 text-sm text-paper focus:outline-none';
  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {premium && <Diamond />}
          <span className="font-display text-lg">{b.name}</span>
          <span className="rounded-full bg-char/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-smoke-300">{b.tier}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${b.subStatus === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{b.subStatus}</span>
        </div>
        {b.subStatus !== 'active' && <button onClick={activate} disabled={busy} className="rounded-lg bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50">Activate</button>}
      </div>
      <div className="mt-1 text-xs text-smoke-400">{b.contactEmail ?? 'no contact email'} · {premium ? 'Premium — invoice agreed amount' : 'Standard — $300/mo'}{b.contractAmountCents ? ` · contract ${money(b.contractAmountCents)}` : ''}</div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-smoke-500">Payment method (record)</label>
          <div className="mt-1 flex gap-2">
            <input className={input + ' flex-1'} placeholder="e.g. ACH / card on file / wire" value={pm} onChange={(e) => setPm(e.target.value)} />
            <button onClick={savePm} disabled={busy} className="rounded-lg border-[0.5px] border-ember-400/20 px-3 py-1.5 text-xs text-smoke-200">Save</button>
          </div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-smoke-500">Invoice</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <input className={input + ' w-24'} inputMode="decimal" placeholder="USD" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className={input + ' w-28'} placeholder="Period" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <input className={input + ' flex-1 min-w-[120px]'} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => invoice(false)} disabled={busy} className="rounded-lg border-[0.5px] border-ember-400/20 px-3 py-1.5 text-xs text-smoke-200">Save draft</button>
            <button onClick={() => invoice(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"><Send size={12} /> Create & send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewQueue() {
  const [rows, setRows] = useState<ReviewReqRow[] | null>(null);
  const load = useCallback(async () => setRows(await listReviewRequests()), []);
  useEffect(() => { load(); }, [load]);
  if (!rows) return <Loader2 className="animate-spin text-ember-400" />;
  if (!rows.length) return <p className="text-sm text-smoke-400">No review requests yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className={`rounded-xl border-[0.5px] p-3 ${r.priority ? 'border-ember-400/30 bg-ember-400/5' : 'border-ember-400/15 bg-char/30'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {r.priority && <Diamond />}<span className="font-medium text-paper">{r.brandName}</span>
              <span className="text-smoke-400">· {r.cigarName}</span>
            </div>
            <StatusSelect value={r.status} onChange={async (v) => { await updateReviewStatus(r.id, v); load(); }} />
          </div>
          <div className="mt-1 text-xs text-smoke-400">{r.email ?? '—'} · {new Date(r.createdAt).toLocaleDateString()}</div>
          {r.message && <p className="mt-1.5 text-sm text-smoke-200">{r.message}</p>}
        </div>
      ))}
    </div>
  );
}

function TicketQueue() {
  const [rows, setRows] = useState<TicketRow[] | null>(null);
  const load = useCallback(async () => setRows(await listSupportTickets()), []);
  useEffect(() => { load(); }, [load]);
  if (!rows) return <Loader2 className="animate-spin text-ember-400" />;
  if (!rows.length) return <p className="text-sm text-smoke-400">No support tickets yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((t) => (
        <div key={t.id} className={`rounded-xl border-[0.5px] p-3 ${t.priority ? 'border-ember-400/30 bg-ember-400/5' : 'border-ember-400/15 bg-char/30'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {t.priority && <Diamond />}<span className="font-medium text-paper">{t.subject}</span>
            </div>
            <StatusSelect value={t.status} onChange={async (v) => { await updateTicketStatus(t.id, v); load(); }} />
          </div>
          <div className="mt-1 text-xs text-smoke-400">{t.brandName} · {t.email ?? '—'} · {new Date(t.createdAt).toLocaleDateString()}</div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-smoke-200">{t.body}</p>
        </div>
      ))}
    </div>
  );
}
