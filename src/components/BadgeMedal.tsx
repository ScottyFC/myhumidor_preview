'use client';

import { useRef, useState } from 'react';
import { Lock, Award } from 'lucide-react';
import { type BadgeDef, TIER_RING } from '@/lib/badges';
import { cn } from '@/lib/utils';

export function BadgeMedal({ badge, earned, size = 124 }: { badge: BadgeDef; earned: boolean; size?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, g: 50 });

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({ ry: (px - 0.5) * 22, rx: -(py - 0.5) * 22, g: px * 100 });
  }
  const reset = () => setT({ rx: 0, ry: 0, g: 50 });

  const ring = TIER_RING[badge.tier] ?? TIER_RING.bronze;

  return (
    <div className="flex flex-col items-center gap-2" style={{ perspective: 700 }}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        className="relative transition-transform duration-150 ease-out will-change-transform"
        style={{ width: size, height: size, transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)`, transformStyle: 'preserve-3d' }}
        title={badge.criteria ? `${badge.name} — ${badge.criteria}` : badge.name}
      >
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-full"
          style={{ background: `radial-gradient(circle at ${t.g}% 30%, rgba(255,255,255,0.30), transparent 55%)`, opacity: earned ? 1 : 0.12 }}
        />
        {badge.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={badge.imageUrl}
            alt={badge.name}
            loading="lazy"
            className={cn('h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)] transition', !earned && 'grayscale brightness-[0.45]')}
          />
        ) : (
          // Generated medallion for badges without bespoke artwork
          <div
            className={cn(
              'flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br p-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.55)] transition',
              ring,
              !earned && 'grayscale brightness-[0.5]'
            )}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-char/90 text-center">
              <Award size={size * 0.26} strokeWidth={1.25} className="text-ember-300" />
              <span className="mt-1 px-2 text-[9px] font-medium uppercase tracking-wider text-smoke-200">{badge.tier}</span>
            </div>
          </div>
        )}
        {!earned && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <Lock size={20} strokeWidth={1.5} className="text-smoke-300/80" />
          </div>
        )}
      </div>
      <div className={cn('max-w-[140px] text-center text-xs font-medium', earned ? 'text-paper' : 'text-smoke-400')}>{badge.name}</div>
    </div>
  );
}
