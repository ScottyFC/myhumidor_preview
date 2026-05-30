import { Suspense } from 'react';
import { SearchClient } from '@/components/SearchClient';

export const metadata = {
  title: 'Search · MyHumidor by CigarTV',
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-6 pt-10 text-smoke-400">Loading search…</div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
