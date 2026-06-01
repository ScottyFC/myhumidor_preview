import Link from 'next/link';

export const metadata = { title: 'Terms & Conditions · MyHumidor by CigarTV' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 pb-20 pt-10">
      <div className="eyebrow mb-2">Legal</div>
      <h1 className="font-display text-5xl tracking-tightest">Terms &amp; Conditions</h1>
      <p className="mt-4 text-sm text-smoke-400">
        Placeholder terms for the preview build — replace with your reviewed legal copy before launch.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-smoke-200">
        <Section title="1. Eligibility">
          You must be 21 years or older to create an account or use MyHumidor. By registering you
          confirm you meet the legal age for tobacco products in your jurisdiction.
        </Section>
        <Section title="2. Your data">
          To run the app we store and process the data tied to your account — your profile, the
          cigars in your humidor and wishlist, your ratings, who you follow, and related activity.
          We use it to power features like your feed, recommendations, and lounge discovery.
        </Section>
        <Section title="3. Lounges & credits">
          Verified lounges earn credits from CigarTV viewership and may spend them on marketing
          placements. Credits hold no cash value and are governed by the Lounge Program terms.
        </Section>
        <Section title="4. Content & corrections">
          Catalog and lounge data may contain errors. Corrections you submit help improve the
          database and may be reviewed before they take effect.
        </Section>
        <Section title="5. Account & deletion">
          You can request deletion of your account and associated data at any time.
        </Section>
      </div>

      <Link href="/register" className="btn-ghost mt-10 text-sm">
        ← Back to sign up
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg text-paper">{title}</h2>
      <p className="mt-1">{children}</p>
    </div>
  );
}
