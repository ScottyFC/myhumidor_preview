'use client';

import { useEffect, useState } from 'react';
import { Check, Plus, Loader2 } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isFollowingLounge, setLoungeFollow, loungeFollowerCount } from '@/lib/lounge-follows';

export function LoungeFollow({ loungeId }: { loungeId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeAuth((s) => setSignedIn(!!s)), []);
  useEffect(() => {
    let off = false;
    loungeFollowerCount(loungeId).then((c) => !off && setCount(c));
    isFollowingLounge(loungeId).then((f) => !off && setFollowing(f));
    return () => { off = true; };
  }, [loungeId, signedIn]);

  async function toggle() {
    if (!signedIn) { window.location.href = '/register'; return; }
    setBusy(true);
    const next = !following;
    const ok = await setLoungeFollow(loungeId, next);
    setBusy(false);
    if (ok) { setFollowing(next); setCount((c) => Math.max(0, c + (next ? 1 : -1))); }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={busy}
        className={following
          ? 'inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-1.5 text-sm text-ember-100 hover:bg-ember-400/10'
          : 'inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-3 py-1.5 text-sm font-medium text-paper hover:bg-ember-600'}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : following ? <Check size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
        {following ? 'Following' : 'Follow'}
      </button>
      <span className="text-sm text-smoke-400"><span className="tabular text-paper">{count}</span> follower{count === 1 ? '' : 's'}</span>
    </div>
  );
}
