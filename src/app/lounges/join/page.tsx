import Link from 'next/link';
import { ArrowRight, MapPin, Tv, Zap, type LucideIcon } from 'lucide-react';

export const metadata = {
  title: 'Become a Verified Lounge · MyHumidor by CigarTV',
};

export default function JoinLoungePage() {  return (
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

      <LoungeTiers />

      <div className="band-rule h-px w-full" />

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

function LoungeTiers() {
  const tiers = [
    {
      name: 'Basic', price: 'Free', tag: 'Always free',
      pitch: 'Be on the map. We never charge a lounge just to be discoverable.',
      features: [
        'Claim your lounge & verify ownership',
        'Update hours, contact, and location',
        'Appear on Cigar Maps and in nearby search',
      ],
      cta: 'Claim your lounge', href: '/lounges', highlight: false, soon: false,
    },
    {
      name: 'Pro', price: '$49–$99', per: '/mo', tag: 'Most popular',
      pitch: 'Show what you carry and talk to the community.',
      features: [
        'Upload & manage live inventory — users see what’s in stock',
        'Lounge Dashboard: post deals, new arrivals & events to the feed',
        'Basic analytics: page & inventory views',
      ],
      cta: 'Start with Pro', href: '/lounges', highlight: true, soon: false,
    },
    {
      name: 'Premium', price: '$149–$199', per: '/mo', tag: '',
      pitch: 'Stand out and stock exactly what locals want.',
      features: [
        '“Featured Lounge” status — gold, bold placement on the map',
        'Push notifications to users within a 10-mile radius',
        'Advanced analytics: aggregate local “Virtual Humidors” demand',
      ],
      cta: 'Go Premium', href: '/lounges', highlight: false, soon: false,
    },
    {
      name: 'Elite / Automation', price: '$249–$299', per: '/mo', tag: 'Coming soon',
      pitch: 'Never manually update inventory again — we plug into your register.',
      features: [
        'Everything in Premium',
        'Real-time POS sync (Square, Clover, Lightspeed, Korona)',
        'Automated “Just Arrived” alerts within 10 miles',
        'White-glove onboarding & priority support',
      ],
      cta: 'Join the waitlist', href: '/lounges/join', highlight: false, soon: true,
    },
  ];

  return (
    <section className="py-12">
      <div className="eyebrow mb-2">Plans</div>
      <h2 className="font-display text-3xl tracking-tightest sm:text-4xl">Choose how far you take it</h2>
      <p className="mt-2 max-w-2xl text-smoke-200">
        Start free on the map. Upgrade when you want live inventory, the social feed, analytics, and reach.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={
              'flex flex-col rounded-xl border-[0.5px] p-5 ' +
              (t.highlight
                ? 'border-ember-400/50 bg-ember-400/5'
                : t.soon
                ? 'border-ember-400/15 bg-char/30 opacity-90'
                : 'border-ember-400/15 bg-char/40')
            }
          >
            {t.tag && (
              <span className="mb-2 inline-block w-fit rounded-full bg-ember-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ember-100">
                {t.tag}
              </span>
            )}
            <div className="font-display text-xl">{t.name}</div>
            <div className="mt-1 font-display text-2xl text-paper">
              {t.price}<span className="text-sm text-smoke-400">{t.per ?? ''}</span>
            </div>
            <p className="mt-2 text-sm text-smoke-300">{t.pitch}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-smoke-200">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={t.href}
              className={'mt-5 inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition ' +
                (t.soon ? 'border-[0.5px] border-ember-400/30 text-ember-100 hover:bg-ember-400/10' : 'bg-ember-400 text-paper hover:bg-ember-600')}
            >
              {t.cta} <ArrowRight size={13} strokeWidth={1.5} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
