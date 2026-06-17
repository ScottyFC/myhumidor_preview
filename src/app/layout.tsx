import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import '@fontsource-variable/fraunces';
import './globals.css';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Analytics } from '@/components/Analytics';
import { NativeShell } from '@/components/NativeShell';
import { MobileTopBar } from '@/components/MobileTopBar';
import { MobileTabBar } from '@/components/MobileTabBar';
import { NativeAuthGate } from '@/components/NativeAuthGate';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myhumidor.shop';

export const metadata: Metadata = {
  title: 'MyHumidor by CigarTV',
  description:
    'Rate, collect, and discover premium cigars. Watch the CigarTV catalog and find every cigar in stock at lounges near you.',
  metadataBase: new URL(SITE),
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'MyHumidor by CigarTV',
    description:
      'Rate, collect, and discover premium cigars. Watch the CigarTV catalog and find every cigar in stock at lounges near you.',
    type: 'website',
    siteName: 'MyHumidor',
    url: SITE,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'MyHumidor by CigarTV' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyHumidor by CigarTV',
    description: 'Rate, collect, and discover premium cigars.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen">
        <div className="web-chrome"><Nav /></div>
        <MobileTopBar />
        <Analytics />
        <NativeShell />
        <main className="pb-32">{children}</main>
        <MobileTabBar />
        <NativeAuthGate />
        <footer className="web-chrome border-t border-ember-400/15 px-6 py-12 text-center">
          <Link href="/" aria-label="MyHumidor home" className="inline-block transition hover:opacity-80">
            <img
              src="/myhumidor-logo.png"
              alt="MyHumidor by CigarTV"
              className="mx-auto h-20 w-auto rounded-lg"
            />
          </Link>
          <div className="mt-4 text-xs uppercase tracking-widest text-smoke-400">
            By{' '}
            <a
              href="https://cigartv.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ember-100 transition hover:text-ember-400"
            >
              CigarTV
            </a>
          </div>

          <div className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-smoke-300">
            <a href="mailto:submissions@cigartv.com" className="hover:text-ember-100">Contact us</a>
            <Link href="/help" className="hover:text-ember-100">Help</Link>
            <Link href="/terms" className="hover:text-ember-100">Terms</Link>
          </div>

          <p className="mx-auto mt-6 max-w-xl border-t border-ember-400/10 pt-4 text-[11px] leading-relaxed text-smoke-400">
            <span className="font-medium text-smoke-300">SURGEON GENERAL WARNING:</span> Cigar smoking
            can cause cancers of the mouth and throat, even if you do not inhale. Tobacco products are
            intended for adults 21 and older. MyHumidor does not sell tobacco products.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-[10px] leading-relaxed text-smoke-500">
            MyHumidor™ and the MyHumidor logo are trademarks of CigarTV. All other brand names, logos,
            and product images are the property of their respective owners and are used for
            identification purposes only; their use does not imply endorsement.
          </p>
        </footer>
      </body>
    </html>
  );
}
