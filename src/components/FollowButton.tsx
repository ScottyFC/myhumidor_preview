'use client';

import { useEffect, useState } from 'react';
import { useAuthGate } from '@/lib/use-auth-gate';
import { UserPlus, UserCheck } from 'lucide-react';
import { isFollowing, toggleFollow, onFollowingChange } from '@/lib/follows';
import { cn } from '@/lib/utils';

export function FollowButton({ handle, size = 'md' }: { handle: string; size?: 'sm' | 'md' }) {
  const gate = useAuthGate();
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    setFollowing(isFollowing(handle));
    return onFollowingChange(() => setFollowing(isFollowing(handle)));
  }, [handle]);

  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm';

  return (
    <button
      onClick={gate(() => setFollowing(toggleFollow(handle)))}
      aria-pressed={following}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition',
        pad,
        following
          ? 'border-[0.5px] border-ember-400/40 text-ember-100 hover:border-red-400/40 hover:text-red-300'
          : 'bg-ember-400 text-paper hover:bg-ember-600'
      )}
    >
      {following ? (
        <>
          <UserCheck size={size === 'sm' ? 12 : 14} strokeWidth={1.5} /> Following
        </>
      ) : (
        <>
          <UserPlus size={size === 'sm' ? 12 : 14} strokeWidth={1.5} /> Follow
        </>
      )}
    </button>
  );
}
