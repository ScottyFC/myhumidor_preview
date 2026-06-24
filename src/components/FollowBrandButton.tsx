'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { isFollowingBrand, setBrandFollow, brandFollowerCount } from '@/lib/brand-follows';
import { subscribeAuth } from '@/lib/auth';

export function FollowBrandButton({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeAuth((s) => setAuthed(!!s)), []);
  useEffect(() => { brandFollowerCount(brandId).then(setCount); if (authed) isFollowingBrand(brandId).then(setFollowing); }, [brandId, authed]);

  async function toggle() {
    if (!authed) { router.push('/register'); return; }
    setBusy(true); const next = !following; const ok = await setBrandFollow(brandId, next);
    setBusy(false);
    if (ok) { setFollowing(next); setCount((c) => (c ?? 0) + (next ? 1 : -1)); }
  }

  return (
    <button onClick={toggle} disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${following ? 'border-[0.5px] border-ember-400/30 text-ember-100' : 'bg-ember-400 text-paper'} disabled:opacity-50`}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : following ? <BellRing size={14} /> : <Bell size={14} />}
      {following ? 'Following' : 'Follow'}{typeof count === 'number' && count > 0 ? ` · ${count}` : ''}
    </button>
  );
}
