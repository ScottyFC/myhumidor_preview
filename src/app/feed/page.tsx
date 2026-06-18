'use client';

import { Feed } from '@/components/Feed';

export default function FeedPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tightest">Feed</h1>
      <p className="mt-1 text-sm text-smoke-400">Recent activity from the people and lounges you follow.</p>
      <div className="mt-6">
        <Feed />
      </div>
    </div>
  );
}
