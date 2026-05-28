import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  value: number;
  outOf?: number;
  size?: number;
  showNumber?: boolean;
  className?: string;
}

export function RatingStars({
  value,
  outOf = 5,
  size = 14,
  showNumber = true,
  className,
}: RatingStarsProps) {
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Star size={size} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
      <span className="tabular font-medium">{value.toFixed(1)}</span>
      {outOf !== 5 && <span className="text-smoke-400 text-xs">/ {outOf}</span>}
    </div>
  );
}

/**
 * Horizontal bar rendering of a 0-5 score — used in the cigar detail's
 * "community average" trio.
 */
export function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0 text-smoke-400">{label}</span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-ember-400/15">
        <div className="absolute inset-y-0 left-0 bg-ember-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right tabular font-medium">{value.toFixed(1)}</span>
    </div>
  );
}
