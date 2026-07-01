'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Feed } from '@/components/Feed';
import { RecentlyAdded } from '@/components/RecentlyAdded';
import { subscribeAuth } from '@/lib/auth';

export default function FeedPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => subscribeAuth((s) => {
    if (s) setAuthed(true);
    else router.replace('/register'); // not signed in → send to login
  }), [router]);

  if (authed !== true) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ember-400" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pt-10">
      <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Feed</h1>
      <p className="mt-1 text-sm text-smoke-400">Recent activity from the people and lounges you follow.</p>
      <div className="mt-6">
        <Feed />
      </div>
      <div className="mt-10 border-t border-ember-400/10 pt-8">
        <RecentlyAdded members />
      </div>
    </div>
  );
}
