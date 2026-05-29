import Link from 'next/link';
import { Star, Heart, MessageCircle } from 'lucide-react';
import type { Cigar, HumidorStatus } from '@/types';
import { getCigarSocial } from '@/lib/mock-data';

interface CigarCardProps {
  cigar: Cigar;
  quantity?: number;
  status?: HumidorStatus;
  yourRating?: number;
}

const STATUS_LABEL: Record<HumidorStatus, string> = {
  aging: 'Aging',
  ready: 'Ready',
  smoked: 'Smoked',
  wishlist: 'Wishlist',
};

export function CigarCard({ cigar, quantity, status, yourRating }: CigarCardProps) {
  return (
    <Link
      href={`/cigars/${cigar.slug}`}
      className="group flex gap-4 rounded-lg border-[0.5px] border-ember-400/15 bg-char/60 p-4 transition hover:border-ember-400/35"
    >
      {/* Stylized "cigar" — a leather rectangle with a band */}
      <div className="relative flex h-16 w-12 shrink-0 items-center overflow-hidden rounded bg-leather-dark">
        <div className="absolute inset-0 bg-gradient-to-b from-leather to-leather-deep" />
        <div className="relative w-full">
          <div className="h-2 bg-ember-600 border-y border-ember-400/40" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="eyebrow mb-0.5 truncate">{cigar.brand}</div>
        <div className="font-display text-base font-medium leading-tight text-paper group-hover:text-ember-100">
          {cigar.line}
        </div>
        <div className="mt-1 text-xs text-smoke-400">
          {cigar.vitola} · {cigar.wrapper}
          {quantity !== undefined && ` · ×${quantity}`}
          {status && status !== 'ready' && (
            <span className="ml-1 text-ember-100">· {STATUS_LABEL[status]}</span>
          )}
        </div>
        <Social cigarId={cigar.id} />
      </div>

      <div className="shrink-0 text-right">
        <div className="inline-flex items-center gap-1 text-sm font-medium text-ember-100 tabular">
          <Star size={12} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
          {(yourRating ?? cigar.overallAvg).toFixed(1)}
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-smoke-400">
          {yourRating ? 'your rating' : 'community'}
        </div>
      </div>
    </Link>
  );
}

function Social({ cigarId }: { cigarId: string }) {
  const s = getCigarSocial(cigarId);
  if (s.likes === 0 && s.comments.length === 0) return null;
  return (
    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-smoke-400">
      <span className="inline-flex items-center gap-1">
        <Heart size={11} strokeWidth={1.5} /> {s.likes.toLocaleString()}
      </span>
      <span className="inline-flex items-center gap-1">
        <MessageCircle size={11} strokeWidth={1.5} /> {s.comments.length}
      </span>
    </div>
  );
}
