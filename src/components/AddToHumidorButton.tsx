'use client';

import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  cigarId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function AddToHumidorButton({ cigarId, size = 'md', className }: Props) {
  const [added, setAdded] = useState(false);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // TODO: write to humidor_entries via Supabase once auth is wired.
    setAdded((v) => !v);
  }

  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm';

  return (
    <button
      onClick={toggle}
      aria-pressed={added}
      data-cigar={cigarId}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition',
        pad,
        added
          ? 'bg-ember-600/30 text-ember-100'
          : 'bg-ember-400 text-paper hover:bg-ember-600',
        className
      )}
    >
      {added ? (
        <Check size={size === 'sm' ? 12 : 14} strokeWidth={2} />
      ) : (
        <Plus size={size === 'sm' ? 12 : 14} strokeWidth={2} />
      )}
      {added ? 'In humidor' : 'Add to humidor'}
    </button>
  );
}
