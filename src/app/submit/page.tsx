import { Suspense } from 'react';
import { SubmitCigarPage } from '@/components/SubmitCigarPage';

export const metadata = {
  title: 'Submit a cigar · MyHumidor by CigarTV',
};

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 pt-10 text-smoke-400">Loading…</div>}>
      <SubmitCigarPage />
    </Suspense>
  );
}
