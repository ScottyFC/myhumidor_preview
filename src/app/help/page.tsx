import Link from 'next/link';

export const metadata = {
  title: 'Help · MyHumidor by CigarTV',
};

const faqs = [
  {
    q: 'How do I add a cigar to my humidor?',
    a: 'Open any cigar page and use “Add to collection.” You can keep cigars in your humidor or on your wishlist, and rate them on flavor, burn, and appearance.',
  },
  {
    q: 'A cigar isn’t in the catalog — can I add it?',
    a: 'Yes. Sign in and use “Submit a Cigar.” Our team reviews submissions and, once approved, the cigar becomes searchable for everyone.',
  },
  {
    q: 'I own a lounge. How do I claim it?',
    a: 'Find your lounge in the directory and use “Claim this lounge,” or submit it from the lounges page and check “I own or manage this lounge.” After approval you can manage inventory and post deals, new arrivals, and events.',
  },
  {
    q: 'How do lounge plans work?',
    a: 'Basic is free — claim your lounge and appear on the map. Pro adds live inventory, the dashboard, and basic analytics. Premium adds featured placement, push notifications, and demand analytics. See the plans on the “Become a Verified Lounge” page.',
  },
  {
    q: 'How do I change my email or password?',
    a: 'Open the menu under your name (top right) and choose Account Settings.',
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-12">
      <div className="eyebrow mb-2">Support</div>
      <h1 className="font-display text-4xl tracking-tightest sm:text-5xl">Help &amp; FAQ</h1>
      <p className="mt-3 max-w-xl text-smoke-200">
        Quick answers to common questions. Still stuck? Email{' '}
        <a href="mailto:submissions@cigartv.com" className="text-ember-100 underline-offset-2 hover:underline">
          submissions@cigartv.com
        </a>{' '}
        and we’ll help.
      </p>

      <div className="mt-10 space-y-4">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-5">
            <h2 className="font-display text-lg">{f.q}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-smoke-200">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <a href="mailto:submissions@cigartv.com" className="btn-primary">Contact us</a>
        <Link href="/terms" className="btn-ghost">Terms &amp; Conditions</Link>
      </div>
    </div>
  );
}
