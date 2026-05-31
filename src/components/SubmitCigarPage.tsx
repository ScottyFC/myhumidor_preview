'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SubmitCigar } from '@/components/SubmitCigar';

export function SubmitCigarPage() {
  const params = useSearchParams();
  const initialName = params.get('name') ?? '';

  return (
    <div className="mx-auto max-w-3xl px-6 pt-6">
      <Link
        href="/search"
        className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-smoke-400 hover:text-paper"
      >
        <ArrowLeft size={12} strokeWidth={1.5} /> Search
      </Link>
      <header className="mb-6">
        <div className="eyebrow mb-2">Grow the catalog</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Submit a cigar</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          Can&apos;t find a cigar? Add it. We check it against the catalog, then a quick review puts
          it live for everyone — and earns you a contributor badge.
        </p>
      </header>
      <SubmitCigar initialName={initialName} />
    </div>
  );
}
