'use client';

import { useEffect, useState } from 'react';
import { useAuthGate } from '@/lib/use-auth-gate';
import { Box, Heart, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type CollectionSeed,
  type CollectionStatus,
  getStatus,
  toggleStatus,
  onCollectionChange,
} from '@/lib/collection';

interface Props {
  seed: CollectionSeed;
  variant?: 'icons' | 'full';
  className?: string;
}

export function AddToCollection({ seed, variant = 'icons', className }: Props) {
  const gate = useAuthGate();
  const [status, setStatus] = useState<CollectionStatus | null>(null);

  useEffect(() => {
    setStatus(getStatus(seed.cigarId));
    return onCollectionChange(() => setStatus(getStatus(seed.cigarId)));
  }, [seed.cigarId]);

  const click = gate(function click(target: CollectionStatus) {
    setStatus(toggleStatus(seed, target));
  });

  if (variant === 'full') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        <button
          onClick={() => click('humidor')}
          aria-pressed={status === 'humidor'}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition',
            status === 'humidor'
              ? 'bg-ember-600/30 text-ember-100'
              : 'bg-ember-400 text-paper hover:bg-ember-600'
          )}
        >
          {status === 'humidor' ? <Check size={15} strokeWidth={2} /> : <Box size={15} strokeWidth={1.5} />}
          {status === 'humidor' ? 'In your humidor' : 'Add to humidor'}
        </button>
        <button
          onClick={() => click('wishlist')}
          aria-pressed={status === 'wishlist'}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border-[0.5px] px-4 py-2 text-sm font-medium transition',
            status === 'wishlist'
              ? 'border-ember-400 bg-ember-400/15 text-ember-100'
              : 'border-ember-400/40 text-paper hover:bg-ember-400/10'
          )}
        >
          <Heart
            size={15}
            strokeWidth={1.5}
            className={cn(status === 'wishlist' && 'fill-ember-400 text-ember-400')}
          />
          {status === 'wishlist' ? 'Wishlisted' : 'Wishlist'}
        </button>
      </div>
    );
  }

  // compact icon variant for list rows
  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <IconToggle
        active={status === 'humidor'}
        onClick={() => click('humidor')}
        label={status === 'humidor' ? 'In humidor' : 'Add to humidor'}
      >
        <Box size={15} strokeWidth={1.5} className={cn(status === 'humidor' && 'text-ember-400')} />
      </IconToggle>
      <IconToggle
        active={status === 'wishlist'}
        onClick={() => click('wishlist')}
        label={status === 'wishlist' ? 'Wishlisted' : 'Add to wishlist'}
      >
        <Heart
          size={15}
          strokeWidth={1.5}
          className={cn(status === 'wishlist' && 'fill-ember-400 text-ember-400')}
        />
      </IconToggle>
    </div>
  );
}

function IconToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md border-[0.5px] transition',
        active
          ? 'border-ember-400 bg-ember-400/15 text-ember-100'
          : 'border-ember-400/20 text-smoke-300 hover:border-ember-400/50 hover:text-paper'
      )}
    >
      {children}
    </button>
  );
}
