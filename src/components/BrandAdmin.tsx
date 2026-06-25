'use client';

import { useEffect, useState, useCallback } from 'react';
import { listPendingVerifications, decideVerification, type PendingVerification } from '@/lib/broker';
import { Loader2, Gem, Send, Inbox, Boxes, MessageSquare, LifeBuoy, ShieldCheck, CreditCard, LayoutGrid, Ticket, Check } from 'lucide-react';
import { BrandSignupQueue } from '@/components/BrandSignupQueue';
import {
  listApprovedBrands, setSubscriptionStatus, setPaymentMethod, createInvoice,
  listReviewRequests, updateReviewStatus, listSupportTickets, updateTicketStatus,
  listBrandSignups,
  type ApprovedBrandRow, type ReviewReqRow, type TicketRow,
} from '@/lib/brands';

type Sub = 'overview' | 'apps' | 'brands' | 'reviews' | 'tickets' | 'verify' | 'preorders';
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
  const [sub, setSub] = useState<Sub>('overview');
  const subs: { id: Sub; label: string; icon: typeof Inbox }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'apps', label: 'Applications', icon: Boxes },
    { id: 'brands', label: 'Brands & billing', icon: CreditCard },
    { id: 'reviews', label: 'CigarTV reviews', icon: MessageSquare },
    { id: 'tickets', label: 'Support tickets', icon: LifeBuoy },
    { id: 'verify', label: 'Verifications', icon: ShieldCheck },
    { id: 'preorders', label: 'Pre-order blocks', icon: Ticket },
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
      {sub === 'overview' && <BrandToolsOverview onJump={setSub} />}
      {sub === 'apps' && <BrandSignupQueue />}
      {sub === 'brands' && <BrandsBilling />}
      {sub === 'reviews' && <ReviewQueue />}
      {sub === 'tickets' && <TicketQueue />}
      {sub === 'verify' && <VerificationQueue />}
      {sub === 'preorders' && <PreorderBlocksQueue />}
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


function Stat({ label, value, onClick }: { label: string; value: number | string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={`rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4 text-left ${onClick ? 'hover:border-ember-400/40' : ''}`}>
      <div className="font-display text-3xl text-ember-100">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-smoke-400">{label}</div>
    </button>
  );
}

function BrandToolsOverview({ onJump }: { onJump: (s: Sub) => void }) {
  const [c, setC] = useState<{ apps: number; brands: number; activeBrands: number; reviews: number; openReviews: number; tickets: number; openTickets: number } | null>(null);
  useEffect(() => { (async () => {
    const [apps, brands, reviews, tickets] = await Promise.all([listBrandSignups('pending'), listApprovedBrands(), listReviewRequests(), listSupportTickets()]);
    setC({
      apps: apps.length,
      brands: brands.length,
      activeBrands: brands.filter((b) => b.subStatus === 'active').length,
      reviews: reviews.length, openReviews: reviews.filter((r) => r.status !== 'done').length,
      tickets: tickets.length, openTickets: tickets.filter((t) => t.status !== 'done').length,
    });
  })(); }, []);
  if (!c) return <Loader2 className="animate-spin text-ember-400" />;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending applications" value={c.apps} onClick={() => onJump('apps')} />
        <Stat label="Approved brands" value={c.brands} onClick={() => onJump('brands')} />
        <Stat label="Open review requests" value={c.openReviews} onClick={() => onJump('reviews')} />
        <Stat label="Open support tickets" value={c.openTickets} onClick={() => onJump('tickets')} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Active subscriptions" value={c.activeBrands} />
        <Stat label="Total review requests" value={c.reviews} />
        <Stat label="Total tickets" value={c.tickets} />
      </div>
      {c.apps > 0 && <p className="mt-4 text-sm text-ember-200">You have {c.apps} brand application{c.apps === 1 ? '' : 's'} awaiting review.</p>}
    </div>
  );
}


function VerificationQueue() {
  const [rows, setRows] = useState<PendingVerification[] | null>(null);
  const load = useCallback(async () => setRows((await listPendingVerifications()).submissions ?? []), []);
  useEffect(() => { load(); }, [load]);
  async function decide(brandId: string, decision: 'verified' | 'rejected') { await decideVerification(brandId, decision); load(); }
  return (
    <div className="space-y-3">
      <p className="text-sm text-smoke-400">Standard brands awaiting wholesale verification. Confirm the business tax details, then verify or reject.</p>
      {rows === null && <p className="text-sm text-smoke-500">Loading…</p>}
      {rows && rows.length === 0 && <p className="text-sm text-smoke-400">No pending verifications.</p>}
      {rows?.map((r) => (
        <div key={r.brand_id} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
          <div className="font-medium text-paper">{r.brands?.name ?? r.legal_name}</div>
          <div className="mt-1 grid gap-1 text-xs text-smoke-400 sm:grid-cols-2">
            <span>Legal name: <span className="text-smoke-200">{r.legal_name}</span></span>
            <span>EIN: <span className="text-smoke-200">{r.ein}</span></span>
            <span>Type: <span className="text-smoke-200">{r.business_type || '—'}</span></span>
            <span>Contact: <span className="text-smoke-200">{r.contact_email || '—'}</span></span>
            <span className="sm:col-span-2">Address: <span className="text-smoke-200">{r.address || '—'}</span></span>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => decide(r.brand_id, 'verified')} className="rounded-lg bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper">Verify</button>
            <button onClick={() => decide(r.brand_id, 'rejected')} className="rounded-lg border-[0.5px] border-ember-400/20 px-3 py-1.5 text-xs text-smoke-300 hover:text-red-300">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}


function PreorderBlocksQueue() {
  const [rows, setRows] = useState<{ id: string; handle: string; display_name: string; preorder_cancel_count: number; total: number; cancelled: number }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch('/api/admin/preorder-blocks').then((x) => x.json()).catch(() => ({ users: [] }));
    setRows(r.users ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function reinstate(userId: string) {
    setBusy(userId);
    await fetch('/api/admin/preorder-blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    setBusy(null); load();
  }

  if (rows === null) return <Loader2 className="animate-spin text-ember-400" />;
  if (rows.length === 0) return <p className="text-sm text-smoke-400">No members are currently blocked from pre-ordering.</p>;
  return (
    <div className="space-y-2">
      <p className="text-sm text-smoke-400">Members temporarily blocked from pre-ordering after repeated self-cancellations. Review their habits and reinstate access.</p>
      {rows.map((u) => (
        <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/30 p-3">
          <div className="min-w-0">
            <div className="truncate font-medium text-paper">{u.display_name || u.handle || u.id.slice(0, 8)}</div>
            <div className="text-xs text-smoke-400">{u.cancelled} cancelled of {u.total} pre-orders · {u.preorder_cancel_count} self-cancels</div>
          </div>
          <button onClick={() => reinstate(u.id)} disabled={busy === u.id} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ember-400 px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50">
            {busy === u.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Reinstate
          </button>
        </div>
      ))}
    </div>
  );
}
