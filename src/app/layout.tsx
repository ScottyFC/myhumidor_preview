import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import '@fontsource-variable/fraunces';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'MyHumidor by CigarTV',
  description:
    'Rate, collect, and discover premium cigars. Watch the CigarTV catalog and find every cigar in stock at lounges near you.',
  metadataBase: new URL('https://myhumidor.app'),
  openGraph: {
    title: 'MyHumidor by CigarTV',
    description:
      'Rate, collect, and discover premium cigars. Watch the CigarTV catalog and find every cigar in stock at lounges near you.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen">
        <Nav />
        <main className="pb-32">{children}</main>
        <footer className="border-t border-ember-400/15 px-6 py-12 text-center">
          <img
            src="/myhumidor-logo.png"
            alt="MyHumidor by CigarTV"
            className="mx-auto h-20 w-auto rounded-lg"
          />
          <div className="mt-4 text-xs uppercase tracking-widest text-smoke-400">
            By CigarTV · Tampa
          </div>
        </footer>
      </body>
    </html>
  );
}
