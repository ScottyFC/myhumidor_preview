'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ArrowRight, PartyPopper, X } from 'lucide-react';
import { setBrandOnboarding, type BrandDetail } from '@/lib/brands';

interface Step { id: string; label: string; hint: string; done: boolean; cta: string; href?: string; jump?: string; ack?: boolean; }

/** Post-approval guide. For a brand newly created at approval (no products yet) it's a
 *  "list your first product" checklist; for a brand linked to an existing catalog page
 *  it's a "manage your page" walk-through. Auto steps reflect real data; ack/dismiss
 *  are stored on brands.onboarding. */
export function BrandOnboarding({
  brandId, slug, detail, productCount, postCount, onChange,
}: { brandId: string; slug: string; detail: BrandDetail; productCount: number; postCount: number; onChange: () => void }) {
  const acked = detail.onboarding?.acked ?? [];
  const [saving, setSaving] = useState(false);
  const isNew = productCount === 0;

  if (detail.onboarding?.dismissed) return null;

  async function ack(id: string) {
    setSaving(true);
    await setBrandOnboarding(brandId, { ...detail.onboarding, acked: Array.from(new Set([...acked, id])) });
    setSaving(false); onChange();
  }
  async function dismiss() {
    setSaving(true);
    await setBrandOnboarding(brandId, { ...detail.onboarding, dismissed: true });
    setSaving(false); onChange();
  }
  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const steps: Step[] = [
    { id: 'logo', label: 'Add your logo', hint: 'Your mark across MyHumidor.', done: !!detail.logoUrl, cta: 'Add logo', jump: 'brand-details' },
    { id: 'bio', label: 'Write your brand bio', hint: 'Tell collectors who you are.', done: !!detail.description, cta: 'Add bio', jump: 'brand-details' },
    { id: 'banner', label: 'Add a banner', hint: 'Hero image for your brand page.', done: !!detail.bannerUrl, cta: 'Add banner', jump: 'brand-details' },
    isNew
      ? { id: 'product', label: 'List your first product', hint: 'Add a cigar to your catalog page.', done: productCount > 0, cta: 'List a cigar', href: `/submit?brand=${encodeURIComponent(slug)}` }
      : { id: 'review-listings', label: 'Review your product listings', hint: `${productCount} ${productCount === 1 ? 'cigar is' : 'cigars are'} already on your page — check the details.`, done: acked.includes('review-listings'), cta: 'Open my page', href: `/brands/${slug}`, ack: true },
    { id: 'post', label: 'Post your first update', hint: 'Announce a release or promo.', done: postCount > 0, cta: 'Compose', jump: 'brand-releases' },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="mt-6 rounded-2xl border-[0.5px] border-ember-400/25 bg-gradient-to-b from-ember-400/8 to-char/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-tightest">{isNew ? 'Get your brand listed' : 'Welcome — manage your brand'}</h2>
          <p className="mt-1 text-sm text-smoke-300">{isNew
            ? 'A few steps to launch your page and list your first product.'
            : 'Your page is linked. Here’s how to make it yours.'}</p>
        </div>
        <button onClick={dismiss} disabled={saving} aria-label="Dismiss" className="rounded-md p-1.5 text-smoke-500 hover:text-paper"><X size={16} /></button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-char/60">
        <div className="h-full rounded-full bg-ember-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-smoke-400">{doneCount} of {steps.length} done</div>

      {allDone ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-ember-400/20 bg-char/40 p-4">
          <span className="flex items-center gap-2 text-sm text-paper"><PartyPopper size={16} className="text-ember-400" /> You’re all set — your brand page is live.</span>
          <button onClick={dismiss} disabled={saving} className="rounded-lg bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper">Done</button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border-[0.5px] border-ember-400/10 bg-char/30 p-3">
              {s.done ? <CheckCircle2 size={18} className="shrink-0 text-ember-400" /> : <Circle size={18} className="shrink-0 text-smoke-500" />}
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${s.done ? 'text-smoke-400 line-through' : 'text-paper'}`}>{s.label}</div>
                {!s.done && <div className="text-xs text-smoke-400">{s.hint}</div>}
              </div>
              {!s.done && (
                s.href ? (
                  <Link href={s.href} onClick={() => s.ack && ack(s.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-ember-400/15 px-3 py-1.5 text-xs font-medium text-ember-200 hover:bg-ember-400/25">
                    {s.cta} <ArrowRight size={12} />
                  </Link>
                ) : (
                  <button onClick={() => s.jump && jump(s.jump)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-ember-400/15 px-3 py-1.5 text-xs font-medium text-ember-200 hover:bg-ember-400/25">
                    {s.cta} <ArrowRight size={12} />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
