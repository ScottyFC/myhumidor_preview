'use client';

import { useEffect, useState } from 'react';
import { subscribeAuth } from '@/lib/auth';

/** Food menu link — viewable by registered (signed-in) users; others are
 *  prompted to sign in. */
export function ViewMenuLink({ url }: { url: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => subscribeAuth((s) => setSignedIn(!!s)), []);

  if (signedIn) {
    return <a href={url} target="_blank" rel="noopener noreferrer" className="text-ember-400 underline">· View menu</a>;
  }
  return <a href="/register" className="text-ember-400 underline">· Sign in to view menu</a>;
}
