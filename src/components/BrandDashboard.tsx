'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Rocket, Trash2, BarChart3, Megaphone, Users, Store, Plus, Sparkles, ShieldCheck, ShieldOff } from 'lucide-react';
import {
  getMyBrands, brandState, brandLogout, createBrandPost, deleteBrandPost,
  useBoost, submitReviewRequest, mfaSetup, mfaEnable, mfaDisable, type MfaSetup,
  type MyBrand, type BrandSubscription, type BrandPost, type BrandDetail,
} from '@/lib/brands';
import { BrandOnboarding } from '@/components/BrandOnboarding';
import { BrandDetailsEditor } from '@/components/BrandDetailsEditor';

export function BrandDashboard() {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<MyBrand[]>([]);
  const [active, setActive] = useState<MyBrand | null>(null);
  const [sub, setSub] = useState<BrandSubscription | null>(null);
  const [posts, setPosts] = useState<BrandPost[]>([]);
  const [detail, setDetail] = useState<BrandDetail | null>(null);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => { (async () => {
    const mine = await getMyBrands();
    setBrands(mine); setActive(mine[0] ?? null); setLoading(false);
  })(); }, []);

  const reload = useCallback(async (_b: MyBrand) => {
    const st = await brandState();
    if (st) { setSub(st.subscription); setPosts(st.posts); setDetail(st.detail); setProductCount(st.productCount); }
  }, []);
  useEffect(() => { if (active) reload(active); }, [active, reload]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ember-400" /></div>;

  if (!active) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <Store size={28} className="mx-auto text-ember-400" />
        <h1 className="mt-3 font-display text-2xl">No brand account yet</h1>
        <p className="mt-2 text-sm text-smoke-300">Brand accounts are a separate division. Log in to your brand portal, or apply for an account.</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link href="/brand/login" className="rounded-lg bg-ember-400 px-5 py-2.5 text-sm font-medium text-paper">Brand portal login</Link>
          <Link href="/for-brands" className="rounded-lg border-[0.5px] border-ember-400/30 px-5 py-2.5 text-sm text-ember-100">Apply</Link>
        </div>
      </div>
    );
  }

  const isPremium = active.tier === 'premium';
  const boostsLeft = sub ? Math.max(0, sub.monthlyBoostQuota - sub.boostsUsed) : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Brand dashboard</div>
          <h1 className="font-display text-4xl tracking-tightest">{active.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/brand/settings" className="rounded-lg border-[0.5px] border-ember-400/20 px-3 py-2 text-xs text-smoke-300 hover:text-paper">Settings</a>
          <button onClick={async () => { await brandLogout(); location.href = '/brand/login'; }} className="rounded-lg border-[0.5px] border-ember-400/20 px-3 py-2 text-xs text-smoke-300 hover:text-paper">Sign out</button>
        </div>
        {brands.length > 1 && (
          <select value={active.id} onChange={(e) => setActive(brands.find((b) => b.id === e.target.value) ?? active)}
            className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm">
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Subscription summary */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
          <div className="text-xs text-smoke-400">Plan</div>
          <div className="mt-1 flex items-center gap-1.5 font-display text-xl capitalize">{isPremium && <Sparkles size={15} className="text-ember-400" />}{active.tier}</div>
          <div className="mt-0.5 text-xs text-smoke-400">{sub?.status ?? '—'}</div>
        </div>
        <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
          <div className="text-xs text-smoke-400">Boosts this month</div>
          <div className="mt-1 font-display text-xl">{isPremium ? 'Unlimited' : `${boostsLeft} / ${sub?.monthlyBoostQuota ?? 3}`}</div>
          <div className="mt-0.5 text-xs text-smoke-400">{isPremium ? 'Included' : 'Extra boosts billed as used'}</div>
        </div>
        <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
          <div className="text-xs text-smoke-400">Seats</div>
          <div className="mt-1 font-display text-xl">{sub?.seats ?? (isPremium ? 'Custom' : 2)}</div>
          <Link href={`/brands/${active.slug}`} className="mt-0.5 inline-block text-xs text-ember-400 hover:underline">View public page →</Link>
        </div>
      </div>

      {detail && (
        <BrandOnboarding brandId={active.id} slug={active.slug} detail={detail} productCount={productCount} postCount={posts.length} onChange={() => reload(active)} />
      )}

      <ReleasePromoPanel brandId={active.id} posts={posts} boostsLeft={isPremium ? Infinity : boostsLeft} onChange={() => reload(active)} />

      {detail && <BrandDetailsEditor brandId={active.id} detail={detail} onSaved={() => reload(active)} />}
      <AnalyticsPanel premium={isPremium} />
      <SecurityPanel mfaEnabled={!!active.mfaEnabled} onChange={() => reload(active)} />
      <ReviewRequestPanel brandId={active.id} premium={isPremium} />
      <SeatsPanel seats={sub?.seats ?? 2} premium={isPremium} />
    </div>
  );
}

function ReleasePromoPanel({ brandId, posts, boostsLeft, onChange }: { brandId: string; posts: BrandPost[]; boostsLeft: number; onChange: () => void }) {
  const [kind, setKind] = useState<BrandPost['kind']>('release');
  const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [releaseDate, setReleaseDate] = useState(''); const [linkUrl, setLinkUrl] = useState('');
  const [boost, setBoost] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    if (!title.trim()) return;
    setBusy(true); setMsg(null);
    let boosted = false;
    if (boost) { boosted = await useBoost(brandId); if (!boosted) setMsg('You’re out of boosts this month — posted without a boost.'); }
    const res = await createBrandPost(brandId, { kind, title, body: body || undefined, releaseDate: kind === 'release' ? (releaseDate || undefined) : undefined, linkUrl: linkUrl || undefined, boosted });
    setBusy(false);
    if (!res.ok) { setMsg(res.error ?? 'Failed to post.'); return; }
    setTitle(''); setBody(''); setReleaseDate(''); setLinkUrl(''); setBoost(false);
    onChange();
  }

  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm focus:border-ember-400/50 focus:outline-none';
  return (
    <section id="brand-releases" className="mt-8 scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Megaphone size={18} className="text-ember-400" /> Releases &amp; promos</h2>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        <div className="flex gap-2">
          {(['release', 'promo', 'announcement'] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-full px-3 py-1 text-xs capitalize ${kind === k ? 'bg-ember-400/15 text-ember-200' : 'bg-char/50 text-smoke-400'}`}>{k}</button>
          ))}
        </div>
        <input className={input + ' mt-3'} placeholder={kind === 'release' ? 'Release name' : kind === 'promo' ? 'Promo headline' : 'Announcement'} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={input + ' mt-2'} rows={2} placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {kind === 'release' && <input className={input} type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />}
          <input className={input} placeholder="Link (optional)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-smoke-200">
            <input type="checkbox" checked={boost} onChange={(e) => setBoost(e.target.checked)} className="accent-ember-400" />
            <Rocket size={13} className="text-ember-400" /> Boost this post {Number.isFinite(boostsLeft) ? `(${boostsLeft} left)` : ''}
          </label>
          <button onClick={add} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Post
          </button>
        </div>
        {msg && <p className="mt-2 text-xs text-ember-200">{msg}</p>}
      </div>

      <div className="mt-3 space-y-2">
        {posts.length === 0 && <p className="text-sm text-smoke-400">No posts yet.</p>}
        {posts.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/10 bg-char/30 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-ember-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ember-200">{p.kind}</span>
                {p.boosted && <span className="inline-flex items-center gap-1 text-[10px] text-ember-300"><Rocket size={10} /> Boosted</span>}
                {p.releaseDate && <span className="text-[10px] text-smoke-400">Drops {p.releaseDate}</span>}
              </div>
              <div className="mt-1 truncate text-sm font-medium">{p.title}</div>
              {p.body && <div className="truncate text-xs text-smoke-400">{p.body}</div>}
            </div>
            <button onClick={async () => { await deleteBrandPost(p.id); onChange(); }} className="shrink-0 text-smoke-500 hover:text-red-300"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalyticsPanel({ premium }: { premium: boolean }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><BarChart3 size={18} className="text-ember-400" /> Analytics</h2>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-5 text-sm text-smoke-300">
        {premium ? 'In-depth product analytics — popularity, humidor adds, rating trends, and lounge demand — populate here as activity comes in.'
          : 'Real-time analytics — which of your cigars are trending by humidor adds and ratings — populate here as activity comes in.'}
        <div className="mt-3 text-xs text-smoke-500">Live metrics activate once your listings start seeing engagement.</div>
      </div>
    </section>
  );
}

function ReviewRequestPanel({ brandId, premium }: { brandId: string; premium: boolean }) {
  const [cigarName, setCigarName] = useState(''); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function send() {
    if (!cigarName.trim()) return;
    setBusy(true); setErr(null);
    const res = await submitReviewRequest(brandId, { cigarName, message: message || undefined, priority: premium });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? 'Failed to send.'); return; }
    setDone(true);
  }
  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm focus:border-ember-400/50 focus:outline-none';
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Megaphone size={18} className="text-ember-400" /> Request a CigarTV review {premium && <span className="rounded-full bg-ember-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ember-200">Priority</span>}</h2>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        {done ? (
          <p className="text-sm text-ember-200">Request sent{premium ? ' with priority' : ''} — CigarTV will be in touch.</p>
        ) : (
          <>
            <input className={input} placeholder="Which cigar?" value={cigarName} onChange={(e) => setCigarName(e.target.value)} />
            <textarea className={input + ' mt-2'} rows={2} placeholder="Anything CigarTV should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
            {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
            <button onClick={send} disabled={busy || !cigarName.trim()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : null} Send request
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function SeatsPanel({ seats, premium }: { seats: number; premium: boolean }) {
  return (
    <section className="mt-8 mb-12">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Users size={18} className="text-ember-400" /> Team seats</h2>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4 text-sm text-smoke-300">
        Your plan includes <span className="text-paper">{premium ? 'custom' : seats}</span> seats. To add a teammate, send them an invite from your account settings (they’ll be added as a manager once they accept).
      </div>
    </section>
  );
}


export function SecurityPanel({ mfaEnabled, onChange }: { mfaEnabled: boolean; onChange: () => void }) {
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);

  async function begin() { setErr(null); setBusy(true); const r = await mfaSetup(); setBusy(false); if (!r.ok || !r.setup) { setErr(r.error ?? 'Could not start setup.'); return; } setSetup(r.setup); }
  async function confirm() { setErr(null); setBusy(true); const r = await mfaEnable(code); setBusy(false); if (!r.ok) { setErr(r.error ?? 'Invalid code.'); return; } setSetup(null); setCode(''); onChange(); }
  async function disable() { setErr(null); setBusy(true); const r = await mfaDisable(code); setBusy(false); if (!r.ok) { setErr(r.error ?? 'Invalid code.'); return; } setDisabling(false); setCode(''); onChange(); }

  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm focus:border-ember-400/50 focus:outline-none';
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><ShieldCheck size={18} className="text-ember-400" /> Security</h2>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-paper">Two-factor authentication {mfaEnabled && <span className="ml-1 rounded-full bg-ember-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ember-200">On</span>}</div>
            <div className="text-xs text-smoke-400">Require a 6-digit authenticator code at login.</div>
          </div>
          {!mfaEnabled && !setup && <button onClick={begin} disabled={busy} className="rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">Enable</button>}
          {mfaEnabled && !disabling && <button onClick={() => setDisabling(true)} className="inline-flex items-center gap-1.5 rounded-lg border-[0.5px] border-ember-400/20 px-3 py-2 text-xs text-smoke-300 hover:text-red-300"><ShieldOff size={14} /> Disable</button>}
        </div>

        {setup && (
          <div className="mt-4 border-t border-ember-400/10 pt-4">
            <p className="text-sm text-smoke-200">Scan this with your authenticator app, then enter the code to confirm.</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {setup.qr && <img src={setup.qr} alt="MFA QR code" className="h-40 w-40 rounded-lg bg-white p-2" />}
              <div className="text-xs text-smoke-400">Can’t scan? Enter this key manually:<br /><code className="mt-1 inline-block break-all text-ember-100">{setup.secret}</code></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input className={input + ' max-w-[180px]'} inputMode="numeric" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
              <button onClick={confirm} disabled={busy || !code} className="rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">Confirm</button>
              <button onClick={() => { setSetup(null); setCode(''); }} className="text-xs text-smoke-400 hover:text-paper">Cancel</button>
            </div>
          </div>
        )}

        {disabling && (
          <div className="mt-4 border-t border-ember-400/10 pt-4">
            <p className="text-sm text-smoke-200">Enter a current authenticator code to turn off MFA.</p>
            <div className="mt-3 flex items-center gap-2">
              <input className={input + ' max-w-[180px]'} inputMode="numeric" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
              <button onClick={disable} disabled={busy || !code} className="rounded-lg border-[0.5px] border-red-400/30 px-4 py-2 text-sm text-red-200 disabled:opacity-50">Disable MFA</button>
              <button onClick={() => { setDisabling(false); setCode(''); }} className="text-xs text-smoke-400 hover:text-paper">Cancel</button>
            </div>
          </div>
        )}
        {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
      </div>
    </section>
  );
}
