'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2, ShieldCheck, Cigarette, Store, UserPlus, Trash2 } from 'lucide-react';
import { subscribeAuth, type Session } from '@/lib/auth';
import { isAdmin, isBootstrapAdmin, listAdmins, promoteAdmin, revokeAdmin, onAdminsChange } from '@/lib/admin';
import {
  getSubmissions,
  setSubmissionStatus,
  onSubmissionsChange,
  type Submission,
} from '@/lib/submissions';
import { cn } from '@/lib/utils';

// Demo pending lounge claims. In production this reads the `lounge_claims` queue.
const INITIAL_CLAIMS = [
  { id: 'lc1', lounge: 'Ybor City Cigar Co.', city: 'Tampa, FL', by: 'Anthony R.', role: 'Owner' },
  { id: 'lc2', lounge: 'Smoke Inn', city: 'West Palm Beach, FL', by: 'Dana L.', role: 'Manager' },
  { id: 'lc3', lounge: 'Cigar Hut', city: 'Austin, TX', by: 'Priya N.', role: 'Owner' },
];

type Tab = 'cigars' | 'lounges' | 'admins';

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [tab, setTab] = useState<Tab>('cigars');

  useEffect(() => {
    return subscribeAuth((s) => {
      setSession(s);
      if (!s) {
        setState('denied');
        router.replace('/register?next=/admin');
      } else {
        setState(isAdmin(s.publicId) ? 'ok' : 'denied');
      }
    });
  }, [router]);

  if (state === 'checking') {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-20 text-center text-smoke-400">
        <Loader2 className="mx-auto animate-spin text-ember-400" size={24} />
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="mx-auto max-w-xl px-6 pt-20 text-center">
        <ShieldCheck className="mx-auto text-smoke-400" size={32} strokeWidth={1.5} />
        <h1 className="font-display mt-4 text-3xl">Admins only</h1>
        <p className="mt-2 text-sm text-smoke-300">
          This area is restricted to CigarTV super admins.
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Cigarette }[] = [
    { id: 'cigars', label: 'Cigar submissions', icon: Cigarette },
    { id: 'lounges', label: 'Lounge claims', icon: Store },
    { id: 'admins', label: 'Admins', icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <header className="mb-6">
        <div className="eyebrow mb-2 flex items-center gap-1.5">
          <ShieldCheck size={13} strokeWidth={1.5} className="text-ember-400" /> Super admin
        </div>
        <h1 className="font-display text-5xl tracking-tightest">Moderation</h1>
        <p className="mt-2 text-sm text-smoke-300">
          Signed in as <span className="text-paper">{session?.displayName}</span>. Approve new cigars
          and lounges, and manage who else can moderate.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border-[0.5px] px-4 py-1.5 text-sm transition',
                tab === t.id
                  ? 'border-ember-400 bg-ember-400/15 text-ember-100'
                  : 'border-ember-400/20 text-smoke-200 hover:border-ember-400/40'
              )}
            >
              <Icon size={14} strokeWidth={1.5} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'cigars' && <CigarQueue />}
      {tab === 'lounges' && <LoungeQueue />}
      {tab === 'admins' && <AdminManager myId={session?.publicId ?? ''} />}
    </div>
  );
}

function CigarQueue() {
  const [subs, setSubs] = useState<Submission[]>([]);
  useEffect(() => {
    const sync = () => setSubs(getSubmissions());
    sync();
    return onSubmissionsChange(sync);
  }, []);

  const pending = subs.filter((s) => s.status === 'pending');
  const decided = subs.filter((s) => s.status !== 'pending');

  if (subs.length === 0) {
    return <Empty label="No cigar submissions yet. User-submitted cigars land here for review." />;
  }

  return (
    <div className="space-y-6">
      <Section title={`Pending (${pending.length})`}>
        {pending.length === 0 ? (
          <div className="text-sm text-smoke-400">Nothing waiting. Nice and clean.</div>
        ) : (
          pending.map((s) => (
            <Row key={s.id} title={`${s.brand} ${s.name}`} sub={`${s.size}${s.country ? ` · ${s.country}` : ''}${s.price != null ? ` · $${s.price}` : ''}`}>
              <Approve onClick={() => setSubmissionStatus(s.id, 'approved')} />
              <Reject onClick={() => setSubmissionStatus(s.id, 'rejected')} />
            </Row>
          ))
        )}
      </Section>
      {decided.length > 0 && (
        <Section title="Recently decided">
          {decided.slice(0, 8).map((s) => (
            <Row key={s.id} title={`${s.brand} ${s.name}`} sub={s.size}>
              <StatusPill status={s.status as 'approved' | 'rejected'} />
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function LoungeQueue() {
  const [claims, setClaims] = useState(INITIAL_CLAIMS);
  const [decided, setDecided] = useState<{ id: string; lounge: string; status: 'approved' | 'rejected' }[]>([]);

  function decide(id: string, status: 'approved' | 'rejected') {
    const claim = claims.find((c) => c.id === id);
    if (claim) setDecided((d) => [{ id, lounge: claim.lounge, status }, ...d]);
    setClaims((c) => c.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <Section title={`Pending claims (${claims.length})`}>
        {claims.length === 0 ? (
          <div className="text-sm text-smoke-400">No pending lounge claims.</div>
        ) : (
          claims.map((c) => (
            <Row key={c.id} title={c.lounge} sub={`${c.city} · ${c.by} (${c.role})`}>
              <Approve onClick={() => decide(c.id, 'approved')} />
              <Reject onClick={() => decide(c.id, 'rejected')} />
            </Row>
          ))
        )}
      </Section>
      {decided.length > 0 && (
        <Section title="Recently decided">
          {decided.map((d) => (
            <Row key={d.id} title={d.lounge} sub="">
              <StatusPill status={d.status} />
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function AdminManager({ myId }: { myId: string }) {
  const [admins, setAdmins] = useState<string[]>([]);
  const [input, setInput] = useState('');
  useEffect(() => {
    const sync = () => setAdmins(listAdmins());
    sync();
    return onAdminsChange(sync);
  }, []);

  return (
    <div>
      <Section title="Super admins">
        {admins.map((id) => (
          <Row key={id} title={id} sub={isBootstrapAdmin(id) ? 'Founder' : id === myId ? 'You' : 'Admin'}>
            {!isBootstrapAdmin(id) && (
              <button
                onClick={() => revokeAdmin(id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border-[0.5px] border-ember-400/20 text-smoke-400 hover:border-red-400/50 hover:text-red-400"
                title="Revoke"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            )}
          </Row>
        ))}
      </Section>

      <div className="mt-5 rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 p-4">
        <div className="eyebrow mb-2">Promote an account</div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a public ID (USER-… or LNGE-…)"
            className="flex-1 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm focus:border-ember-400 focus:outline-none"
          />
          <button
            onClick={() => {
              if (input.trim()) {
                promoteAdmin(input.trim());
                setInput('');
              }
            }}
            className="btn-primary text-sm"
          >
            <UserPlus size={14} strokeWidth={1.5} /> Make admin
          </button>
        </div>
        <p className="mt-2 text-xs text-smoke-400">
          In production this sets <code className="text-ember-100">profiles.role = &apos;super_admin&apos;</code>{' '}
          for that account.
        </p>
      </div>
    </div>
  );
}

/* ── small UI helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        {sub && <div className="truncate text-xs text-smoke-400">{sub}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
function Approve({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1 rounded-md bg-ember-400 px-3 text-xs font-medium text-paper hover:bg-ember-600"
    >
      <Check size={13} strokeWidth={2} /> Approve
    </button>
  );
}
function Reject({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1 rounded-md border-[0.5px] border-ember-400/20 px-3 text-xs text-smoke-300 hover:border-red-400/50 hover:text-red-400"
    >
      <X size={13} strokeWidth={2} /> Reject
    </button>
  );
}
function StatusPill({ status }: { status: 'approved' | 'rejected' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wider',
        status === 'approved' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'
      )}
    >
      {status}
    </span>
  );
}
function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/20 p-10 text-center text-sm text-smoke-400">
      {label}
    </div>
  );
}
