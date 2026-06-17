'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2, ShieldCheck, Cigarette, Store, UserPlus, Trash2, BadgeCheck, MapPin, MessageSquare, History, KeyRound, ChevronDown, Megaphone, BarChart3, Crown, Upload } from 'lucide-react';
import { AdManager } from '@/components/AdManager';
import { MemberVerify } from '@/components/MemberVerify';
import { BulkCatalogTool } from '@/components/BulkCatalogTool';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { subscribeAuth, type Session } from '@/lib/auth';
import { isAdmin, isBootstrapAdmin, listAdmins, promoteAdmin, revokeAdmin, onAdminsChange } from '@/lib/admin';
import {
  getClaims, setClaimStatus, subscribeClaims, type LoungeClaim,
} from '@/lib/lounges-owner';
import { ActivityLog } from '@/components/ActivityLog';
import {
  getLoungeSubmissions, setLoungeSubmissionStatus, onLoungeSubmissionsChange,
  type LoungeSubmission,
} from '@/lib/lounge-submissions';
import { recentLounges, certifyLounge, geocodeMissingLounges, type RecentLounge } from '@/lib/db';
import {
  getChangeRequests, setChangeRequestStatus, onChangeRequestsChange, type ChangeRequest,
} from '@/lib/change-requests';
import {
  getSubmissions,
  setSubmissionStatus,
  onSubmissionsChange,
  type Submission,
} from '@/lib/submissions';
import { cn } from '@/lib/utils';

type Tab = 'cigars' | 'lounges' | 'claims' | 'certify' | 'requests' | 'log' | 'ads' | 'admins' | 'analytics' | 'members' | 'bulk';

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
    { id: 'lounges', label: 'Lounge submissions', icon: Store },
    { id: 'claims', label: 'Lounge claims', icon: KeyRound },
    { id: 'ads', label: 'Ad campaigns', icon: Megaphone },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'certify', label: 'Certify lounges', icon: BadgeCheck },
    { id: 'members', label: 'Verify members', icon: Crown },
    { id: 'bulk', label: 'Bulk catalog', icon: Upload },
    { id: 'requests', label: 'Change requests', icon: MessageSquare },
    { id: 'log', label: 'Activity log', icon: History },
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

      {tab === 'analytics' && <AnalyticsPanel />}
      {tab === 'cigars' && <CigarQueue />}
      {tab === 'members' && <MemberVerify />}
      {tab === 'bulk' && <BulkCatalogTool />}
      {tab === 'lounges' && <LoungeQueue />}
      {tab === 'claims' && <ClaimsQueue />}
      {tab === 'certify' && <CertifyQueue />}
      {tab === 'requests' && <ChangeRequestQueue />}
      {tab === 'ads' && <AdManager />}
      {tab === 'log' && <ActivityLog />}
      {tab === 'admins' && <AdminManager myId={session?.publicId ?? ''} />}
    </div>
  );
}

function CigarQueue() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    const sync = () => setSubs(getSubmissions());
    sync();
    return onSubmissionsChange(sync);
  }, []);

  async function decide(id: string, status: 'approved' | 'rejected') {
    setErr('');
    const r = await setSubmissionStatus(id, status);
    if (!r.ok) setErr(r.error ?? 'Update failed.');
  }

  const pending = subs.filter((s) => s.status === 'pending');
  const decided = subs.filter((s) => s.status !== 'pending');
  // Decided + older than 7 days → archived (out of the working list).
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const decidedAt = (s: Submission) => new Date(s.reviewedAt ?? s.createdAt).getTime();
  const recentDecided = decided.filter((s) => Date.now() - decidedAt(s) <= SEVEN_DAYS);
  const archived = decided
    .filter((s) => Date.now() - decidedAt(s) > SEVEN_DAYS)
    .sort((a, b) => decidedAt(b) - decidedAt(a));

  if (subs.length === 0) {
    return <Empty label="No cigar submissions yet. User-submitted cigars land here for review." />;
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-md border-[0.5px] border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
          {err}
        </div>
      )}
      <Section title={`Pending (${pending.length})`}>
        {pending.length === 0 ? (
          <div className="text-sm text-smoke-400">Nothing waiting. Nice and clean.</div>
        ) : (
          pending.map((s) => (
            <div key={s.id} className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/40">
              <div className="flex items-center justify-between gap-3 p-4">
                <button onClick={() => setOpenId(openId === s.id ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown size={15} strokeWidth={1.5} className={cn('shrink-0 text-smoke-400 transition', openId === s.id && 'rotate-180')} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.brand} {s.name}</div>
                    <div className="truncate text-xs text-smoke-400">
                      {s.size}{s.country ? ` · ${s.country}` : ''}{s.price != null ? ` · $${s.price}` : ''}
                    </div>
                  </div>
                </button>
                <div className="flex shrink-0 gap-2">
                  <Approve onClick={() => decide(s.id, 'approved')} />
                  <Reject onClick={() => decide(s.id, 'rejected')} />
                </div>
              </div>
              {openId === s.id && <SubmissionDetail s={s} />}
            </div>
          ))
        )}
      </Section>
      {recentDecided.length > 0 && (
        <Section title="Recently decided">
          {recentDecided.slice(0, 12).map((s) => (
            <Row
              key={s.id}
              title={`${s.brand} ${s.name}`}
              sub={`${s.size}${s.reviewerName ? ` · ${s.status} by ${s.reviewerName}` : ` · ${s.status}`}`}
            >
              <StatusPill status={s.status as 'approved' | 'rejected'} />
              {s.status === 'rejected' && (
                <button
                  onClick={() => decide(s.id, 'approved')}
                  className="inline-flex h-8 items-center gap-1 rounded-md border-[0.5px] border-ember-400/30 px-2.5 text-xs font-medium text-ember-100 hover:bg-ember-400/10"
                >
                  <Check size={13} strokeWidth={2} /> Approve instead
                </button>
              )}
            </Row>
          ))}
        </Section>
      )}

      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchive((v) => !v)}
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-smoke-400 transition hover:text-paper"
          >
            <ChevronDown size={14} strokeWidth={1.5} className={cn('transition', showArchive && 'rotate-180')} />
            Archive · {archived.length} decided &gt; 7 days ago
          </button>
          {showArchive && (
            <div className="mt-3 space-y-2 border-l-[0.5px] border-ember-400/15 pl-4">
              {archived.map((s) => (
                <Row
                  key={s.id}
                  title={`${s.brand} ${s.name}`}
                  sub={`${s.size} · ${s.status}${s.reviewedAt ? ` · ${new Date(s.reviewedAt).toLocaleDateString()}` : ''}`}
                >
                  <StatusPill status={s.status as 'approved' | 'rejected'} />
                </Row>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionDetail({ s }: { s: Submission }) {
  return (
    <div className="border-t-[0.5px] border-ember-400/10 px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        {s.photoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.photoDataUrl} alt={s.name} className="h-32 w-28 shrink-0 rounded-lg object-cover" />
        )}
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Detail label="Brand" value={s.brand} />
          <Detail label="Name" value={s.name} />
          <Detail label="Size" value={s.size || '—'} />
          <Detail label="Country" value={s.country || '—'} />
          <Detail label="MSRP" value={s.price != null ? `$${s.price}` : '—'} />
          <Detail label="Submitted" value={new Date(s.createdAt).toLocaleDateString()} />
          {s.notes && <div className="col-span-2"><Detail label="Notes" value={s.notes} /></div>}
        </dl>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 text-paper">{value}</dd>
    </div>
  );
}

function ClaimsQueue() {
  const [claims, setClaims] = useState<LoungeClaim[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => getClaims().then(setClaims);
  useEffect(() => {
    load();
    return subscribeClaims(load);
  }, []);

  async function decide(c: LoungeClaim, status: 'approved' | 'rejected') {
    setBusy(c.id);
    await setClaimStatus(c, status);
    setBusy(null);
    load();
  }

  if (claims === null) {
    return <div className="py-10 text-center"><Loader2 className="mx-auto animate-spin text-ember-400" size={20} /></div>;
  }

  const pending = claims.filter((c) => c.status === 'pending');
  const decided = claims.filter((c) => c.status !== 'pending');

  return (
    <div className="space-y-6">
      <Section title={`Pending claims (${pending.length})`}>
        {pending.length === 0 ? (
          <div className="text-sm text-smoke-400">No lounge claims waiting. Owners claim their lounge from its profile page.</div>
        ) : (
          pending.map((c) => (
            <div key={c.id} className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/40">
              <div className="flex items-center justify-between gap-3 p-4">
                <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown size={15} strokeWidth={1.5} className={cn('shrink-0 text-smoke-400 transition', openId === c.id && 'rotate-180')} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.loungeName}</div>
                    <div className="truncate text-xs text-smoke-400">{c.claimantName}{c.roleRequested ? ` · ${c.roleRequested}` : ''}</div>
                  </div>
                </button>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => decide(c, 'approved')} disabled={busy === c.id} className="inline-flex h-8 items-center gap-1 rounded-md bg-ember-400 px-2.5 text-xs font-medium text-paper hover:bg-ember-600 disabled:opacity-60">
                    {busy === c.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2} />} Approve
                  </button>
                  <Reject onClick={() => decide(c, 'rejected')} />
                </div>
              </div>
              {openId === c.id && (
                <div className="border-t-[0.5px] border-ember-400/10 px-4 py-4">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <Detail label="Lounge" value={c.loungeName} />
                    <Detail label="Claimant" value={c.claimantName} />
                    <Detail label="Role" value={c.roleRequested || '—'} />
                    <Detail label="Email" value={c.email || '—'} />
                    <Detail label="Phone" value={c.phone || '—'} />
                    <Detail label="Submitted" value={new Date(c.createdAt).toLocaleDateString()} />
                  </dl>
                </div>
              )}
            </div>
          ))
        )}
      </Section>
      {decided.length > 0 && (
        <Section title="Recently decided">
          {decided.slice(0, 12).map((c) => (
            <Row key={c.id} title={c.loungeName} sub={c.claimantName}>
              <StatusPill status={c.status as 'approved' | 'rejected'} />
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function LoungeQueue() {
  const [subs, setSubs] = useState<LoungeSubmission[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    const sync = () => setSubs(getLoungeSubmissions());
    sync();
    return onLoungeSubmissionsChange(sync);
  }, []);

  async function decide(id: string, status: 'approved' | 'rejected') {
    setErr('');
    const r = await setLoungeSubmissionStatus(id, status);
    if (!r.ok) setErr(r.error ?? 'Update failed.');
  }

  const pending = subs.filter((s) => s.status === 'pending');
  const decided = subs.filter((s) => s.status !== 'pending');

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-md border-[0.5px] border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
          {err}
        </div>
      )}
      <Section title={`Pending (${pending.length})`}>
        {pending.length === 0 ? (
          <div className="text-sm text-smoke-400">No lounge submissions waiting. They appear here when members submit a lounge.</div>
        ) : (
          pending.map((s) => (
            <Row
              key={s.id}
              title={`${s.kind === 'verify' ? '🛡 Verify · ' : ''}${s.name}`}
              sub={[
                [s.address, s.city, s.state].filter(Boolean).join(', '),
                s.phone, s.website,
                s.businessLicense ? `License: ${s.businessLicense}` : '',
                s.contactName ? `Contact: ${s.contactName}` : '',
                s.claimsOwnership ? 'Claims ownership' : '',
              ].filter(Boolean).join(' · ')}
            >
              <Approve onClick={() => decide(s.id, 'approved')} />
              <Reject onClick={() => decide(s.id, 'rejected')} />
            </Row>
          ))
        )}
      </Section>
      {decided.length > 0 && (
        <Section title="Recently decided">
          {decided.slice(0, 12).map((s) => (
            <Row
              key={s.id}
              title={s.name}
              sub={`${[s.city, s.state].filter(Boolean).join(', ')}${s.reviewerName ? ` · ${s.status} by ${s.reviewerName}` : ` · ${s.status}`}`}
            >
              <StatusPill status={s.status as 'approved' | 'rejected'} />
              {s.status === 'rejected' && (
                <button
                  onClick={() => decide(s.id, 'approved')}
                  className="inline-flex h-8 items-center gap-1 rounded-md border-[0.5px] border-ember-400/30 px-2.5 text-xs font-medium text-ember-100 hover:bg-ember-400/10"
                >
                  <Check size={13} strokeWidth={2} /> Approve instead
                </button>
              )}
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function CertifyQueue() {
  const [lounges, setLounges] = useState<RecentLounge[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [geo, setGeo] = useState<'idle' | 'running' | string>('idle');

  useEffect(() => {
    recentLounges(24).then(setLounges);
  }, []);

  async function runGeocode() {
    setGeo('running');
    const r = await geocodeMissingLounges(25);
    setGeo(`Located ${r.fixed}, ${r.failed} couldn't be matched, ${r.remaining} still missing.`);
    setLounges(await recentLounges(24));
  }

  async function toggle(l: RecentLounge) {
    setPending(l.slug);
    const ok = await certifyLounge(l.slug, !l.certified);
    setPending(null);
    if (ok) {
      const fresh = await recentLounges(24);
      setLounges(fresh);
    }
  }

  if (lounges === null) {
    return <div className="py-10 text-center"><Loader2 className="mx-auto animate-spin text-ember-400" size={20} /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 px-4 py-3">
        <div className="text-sm text-smoke-300">
          Geocode approved lounges that are missing a location so they appear on the map.
        </div>
        <button
          onClick={runGeocode}
          disabled={geo === 'running'}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 text-xs font-medium text-ember-100 hover:bg-ember-400/10 disabled:opacity-60"
        >
          {geo === 'running' ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} strokeWidth={1.5} />}
          Geocode missing locations
        </button>
      </div>
      {geo !== 'idle' && geo !== 'running' && <div className="text-xs text-smoke-400">{geo}</div>}

      <Section title="Recently added lounges">
      {lounges.length === 0 ? (
        <div className="text-sm text-smoke-400">No lounges in the database yet. Approve a lounge submission and it shows here to certify.</div>
      ) : (
        lounges.map((l) => (
          <Row key={l.slug} title={l.name} sub={[l.city, l.state].filter(Boolean).join(', ')}>
            {l.certified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-ember-400/15 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-ember-100">
                <BadgeCheck size={12} strokeWidth={1.5} /> Certified
              </span>
            ) : (
              <button
                onClick={() => toggle(l)}
                disabled={pending === l.slug}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-ember-400 px-3 text-xs font-medium text-paper hover:bg-ember-600 disabled:opacity-60"
              >
                {pending === l.slug ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} strokeWidth={1.5} />}
                Certify
              </button>
            )}
          </Row>
        ))
      )}
      </Section>
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
function ChangeRequestQueue() {
  const [reqs, setReqs] = useState<ChangeRequest[]>([]);
  useEffect(() => {
    const sync = () => setReqs(getChangeRequests());
    sync();
    return onChangeRequestsChange(sync);
  }, []);

  const open = reqs.filter((r) => r.status === 'open');
  const closed = reqs.filter((r) => r.status !== 'open');

  return (
    <div className="space-y-6">
      <Section title={`Open (${open.length})`}>
        {open.length === 0 ? (
          <div className="text-sm text-smoke-400">No open correction requests. They appear here when members flag wrong data.</div>
        ) : (
          open.map((r) => (
            <div key={r.id} className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="eyebrow">{r.targetType}</span>
                    <Link
                      href={`/${r.targetType === 'cigar' ? 'cigars' : 'lounges'}/${r.targetId}`}
                      className="truncate text-sm font-medium hover:text-ember-100"
                    >
                      {r.targetName}
                    </Link>
                  </div>
                  <p className="mt-1.5 text-sm text-smoke-200">{r.message}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setChangeRequestStatus(r.id, 'resolved')}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-ember-400 px-2.5 text-xs font-medium text-paper hover:bg-ember-600"
                  >
                    <Check size={13} strokeWidth={2} /> Resolve
                  </button>
                  <button
                    onClick={() => setChangeRequestStatus(r.id, 'dismissed')}
                    className="inline-flex h-8 items-center gap-1 rounded-md border-[0.5px] border-ember-400/25 px-2.5 text-xs text-smoke-300 hover:bg-ember-400/10"
                  >
                    <X size={13} strokeWidth={2} /> Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </Section>
      {closed.length > 0 && (
        <Section title="Recently handled">
          {closed.slice(0, 12).map((r) => (
            <Row
              key={r.id}
              title={r.targetName}
              sub={`${r.message.slice(0, 60)}${r.reviewerName ? ` · ${r.status} by ${r.reviewerName}` : ''}`}
            >
              <span className="rounded-full bg-char px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-smoke-300">
                {r.status}
              </span>
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

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
