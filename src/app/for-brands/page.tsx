import { Check, Megaphone, BarChart3, Rocket, Users, BadgeCheck, Store } from 'lucide-react';
import { BrandSignupForm } from '@/components/BrandSignupForm';

export const metadata = { title: 'For Brands · MyHumidor by CigarTV' };

const STANDARD = [
  { icon: Store, t: 'Manage your listings', d: 'Own and edit your brand page and product listings.' },
  { icon: BarChart3, t: 'Real-time analytics', d: 'See which of your cigars are catching fire.' },
  { icon: Rocket, t: '3 boosted posts / month', d: 'Promote releases and promos; extra boosts billed as used.' },
  { icon: Users, t: 'An extra seat', d: 'Add a teammate to manage the page with you.' },
  { icon: Megaphone, t: 'Request a review', d: 'Submit a product review request from your dashboard.' },
];
const PREMIUM = [
  { icon: Store, t: 'Sell direct to lounges', d: 'Lounges can buy directly from your brand.' },
  { icon: BadgeCheck, t: 'Custom collectible badges', d: 'Branded badges for consumers to collect.' },
  { icon: BarChart3, t: 'In-depth product analytics', d: 'Deeper insight into how your products perform.' },
  { icon: Users, t: 'Custom seats', d: 'As many teammates as you need.' },
  { icon: Megaphone, t: 'Priority CigarTV reviews', d: 'Send priority review requests straight to CigarTV.' },
];

export default function ForBrandsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-12">
      <div className="eyebrow mb-2">For Brands</div>
      <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Put your brand in front of the people who love cigars.</h1>
      <p className="mt-4 max-w-2xl text-smoke-200">
        Manage your listings, announce upcoming releases, run promos, and advertise across MyHumidor —
        with analytics on what’s resonating. Approved by our team to keep the catalog trustworthy.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border-[0.5px] border-ember-400/20 bg-char/30 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Standard</h2>
            <div className="text-right"><span className="font-display text-2xl text-ember-300">$300</span><span className="text-sm text-smoke-400">/mo</span></div>
          </div>
          <ul className="mt-4 space-y-3">
            {STANDARD.map((f) => (
              <li key={f.t} className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-ember-400" /><span><span className="text-sm font-medium text-paper">{f.t}</span><span className="block text-xs text-smoke-400">{f.d}</span></span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border-[0.5px] border-ember-400/40 bg-gradient-to-b from-ember-400/10 to-char/30 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Premium</h2>
            <div className="text-sm text-smoke-300">Custom pricing</div>
          </div>
          <p className="mt-1 text-xs text-smoke-400">Everything in Standard, plus:</p>
          <ul className="mt-3 space-y-3">
            {PREMIUM.map((f) => (
              <li key={f.t} className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-ember-400" /><span><span className="text-sm font-medium text-paper">{f.t}</span><span className="block text-xs text-smoke-400">{f.d}</span></span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="font-display text-3xl tracking-tightest">Apply</h2>
          <p className="mt-2 text-sm text-smoke-300">
            Every application is reviewed by a super admin. If your brand is already in our catalog,
            we’ll link you to manage it; if not, we’ll create it on approval and walk you through listing your first product.
            Brand accounts are a separate division — no consumer sign-in required to apply.
          </p>
        </div>
        <BrandSignupForm />
      </div>
    </div>
  );
}
