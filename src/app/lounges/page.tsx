import Link from 'next/link';
import { ArrowRight, MapPin, Tv, Zap, type LucideIcon } from 'lucide-react';

export const metadata = {
  title: 'The Lounge Program · MyHumidor by CigarTV',
};

export default function LoungesPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <header className="mb-12">
        <div className="eyebrow mb-2">For lounges and shops</div>
        <h1 className="font-display text-6xl tracking-tightest leading-[0.95]">
          Become a <span className="italic text-ember-400">verified</span>
          <br />
          CigarTV partner.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-smoke-200">
          A free TV stick. Measurable foot traffic. The verified blue check on every map your
          customers use. A direct line to the most engaged audience in premium cigar — at no upfront
          cost.
        </p>
      </header>

      <div className="band-rule h-px w-full" />

      {/* What you get */}
      <section className="py-12">
        <div className="eyebrow mb-6">What you get</div>
        <div className="grid gap-8 sm:grid-cols-3">
          <Benefit
            n="01"
            icon={Tv}
            title="A free TV stick"
            body="Shipped to your lounge once verified. Plugs into any HDMI input. Streams CigarTV 24/7 and displays your live menu and the cigars featured on whatever episode is playing."
          />
          <Benefit
            n="02"
            icon={Zap}
            title="Credits, automatically"
            body="Every hour the channel plays in your lounge accrues credits. Spend them on in-app profile boosts, geo-targeted ads, or featured placement when episodes drop new cigars."
          />
          <Benefit
            n="03"
            icon={MapPin}
            title="The verified check"
            body="Show up in Cigar Maps with the verified badge. Inventory you mark in-stock surfaces to every user in your radius — and to anyone watching an episode that features it."
          />
        </div>
      </section>

      <div className="band-rule h-px w-full" />

      {/* The credit economy */}
      <section className="py-12">
        <div className="eyebrow mb-6">The credit economy</div>
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="font-display text-2xl mb-2">You earn</h3>
            <p className="text-smoke-200">
              Verified active viewing time on your TV stick during open hours. Capped daily so volume
              can't be gamed. Brand sponsorships flow back into the credit pool as bonus multipliers
              during their episodes.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl mb-2">You spend</h3>
            <p className="text-smoke-200">
              Boosted lounge profile in nearby search. Featured pin on Cigar Maps. Geo-targeted promo
              cards in-app. Priority placement when an episode features a cigar you stock.
            </p>
          </div>
        </div>
      </section>

      <div className="band-rule h-px w-full" />

      {/* How it works */}
      <section className="py-12">
        <div className="eyebrow mb-6">How it works</div>
        <div className="grid gap-6 sm:grid-cols-4">
          {[
            ['Claim', 'Sign up. Verify your business with a license or storefront photo.'],
            ['We ship', 'Free TV stick mailed within 5 business days.'],
            ['Stock the menu', 'Update live inventory from a phone, tablet, or web dashboard.'],
            ['Earn & grow', 'Credits accrue while the channel runs. Redeem for visibility.'],
          ].map(([title, body], i) => (
            <div key={title} className="border-l-[0.5px] border-ember-400/30 pl-4">
              <div className="font-display text-4xl italic text-ember-400 tabular">{i + 1}</div>
              <div className="mt-2 font-medium">{title}</div>
              <div className="mt-1 text-sm text-smoke-400 leading-relaxed">{body}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="band-rule h-px w-full" />

      {/* By the numbers */}
      <section className="py-12">
        <div className="eyebrow mb-6">By the numbers</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['$0', 'Up-front cost. No hardware fee, no monthly subscription.'],
            ['24/7', 'Continuous CigarTV programming with full VOD catalog access.'],
            ['5 mi+', 'Default geo radius for in-app store surfacing. Adjustable per market.'],
          ].map(([num, label]) => (
            <div key={num} className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-5">
              <div className="font-display text-4xl tabular">{num}</div>
              <div className="mt-2 text-xs leading-relaxed text-smoke-400">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="my-12 rounded-xl border-[0.5px] border-ember-400/30 bg-ember-400/5 p-10 text-center">
        <h3 className="font-display text-3xl mb-2">Apply for the Lounge Program</h3>
        <p className="text-smoke-200 mb-6">Verification typically completes in 48 hours.</p>
        <a href="mailto:lounges@cigartv.com" className="btn-primary text-base">
          Apply now <ArrowRight size={15} strokeWidth={1.5} />
        </a>
        <div className="mt-5 text-sm text-smoke-400">
          Already a partner?{' '}
          <Link href="/dashboard" className="text-ember-100 underline-offset-4 hover:underline">
            Open your lounge dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

function Benefit({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: string;
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="border-t-2 border-ember-400 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} strokeWidth={1.5} className="text-ember-400" />
        <span className="eyebrow tabular">{n}</span>
      </div>
      <div className="font-display text-lg font-medium leading-tight">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-smoke-400">{body}</p>
    </div>
  );
}
