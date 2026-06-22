'use client';

import { useRef, useState } from 'react';
import {
  Lock, Award, Star, Flame, Crown, Gem, Globe2, Coffee, Leaf, Trophy, Archive,
  MapPin, CalendarDays, Zap, Heart, Moon, Banknote, Layers, Compass, Cigarette,
} from 'lucide-react';

/**
 * Themed iconography: each badge gets an icon matched to what it's actually
 * about (rating, humidor, Cuban smokes, price milestones, check-ins…) instead
 * of a generic medal — with a deterministic fallback so no two adjacent
 * generated badges look identical.
 */
const ICON_RULES: Array<[RegExp, typeof Award]> = [
  [/cuban|habana|forbidden/i, Globe2],
  [/coffee|cafe|espresso|leche/i, Coffee],
  [/100|perfect|flawless/i, Trophy],
  [/humidor|stock|collect|log/i, Archive],
  [/check.?in|lounge|visit/i, MapPin],
  [/first|light|pour|novice/i, Flame],
  [/anniversar|year|birthday|aged/i, CalendarDays],
  [/\$|price|premium|unicorn|cost/i, Gem],
  [/rate|review|score|tasting/i, Star],
  [/streak|week|daily|chain/i, Zap],
  [/wrapper|leaf|shade|maduro|connecticut/i, Leaf],
  [/night|midnight|after.?hours/i, Moon],
  [/spend|cash|big/i, Banknote],
  [/box|bundle|set|trio|culebra/i, Layers],
  [/explore|discover|world|travel|archer/i, Compass],
  [/smoke|cigar/i, Cigarette],
  [/king|royal|crown|aficionado/i, Crown],
  [/love|favorite|heart/i, Heart],
];
const ICON_POOL = [Star, Flame, Gem, Compass, Leaf, Trophy, Zap, Moon, Layers, Heart];

function iconFor(badge: BadgeDef): typeof Award {
  const text = `${badge.name} ${badge.criteria ?? ''}`;
  for (const [re, I] of ICON_RULES) if (re.test(text)) return I;
  let h = 0;
  for (let i = 0; i < badge.id.length; i++) h = (h * 31 + badge.id.charCodeAt(i)) | 0;
  return ICON_POOL[Math.abs(h) % ICON_POOL.length];
}

const TIER_DOT: Record<string, string> = {
  bronze: 'bg-amber-700', silver: 'bg-slate-300', gold: 'bg-amber-300',
  rare: 'bg-fuchsia-400', lounge: 'bg-ember-400',
};
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
          // Rare badges: render the matching icon as an ULTRA-SHINY holographic
          // medallion (iridescent hue-shifting ring + gloss + sheen) instead of the
          // uploaded artwork, which often ships with an unremovable black background.
          <div className="relative h-full w-full overflow-hidden rounded-full shadow-[0_8px_28px_rgba(240,195,85,0.4)]">
            <div
              className={cn('absolute inset-0 rounded-full', earned && 'animate-[holoHue_7s_linear_infinite]')}
              style={{ background: 'conic-gradient(from 0deg, #f0c355, #8fd3ff, #ff9ff0, #9dffc9, #ffd98f, #c0a3ff, #f0c355)' }}
            />
            <div className={cn('absolute inset-[3px] flex flex-col items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#201a13] to-[#0b0805]', !earned && 'grayscale brightness-[0.5]')}>
              <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120%_80%_at_30%_0%,rgba(255,255,255,0.4),transparent_55%)]" />
              {earned && <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[sheen_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/45 to-transparent" />}
              {(() => { const I = iconFor(badge); return <I size={size * 0.34} strokeWidth={1.25} className="relative text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.6)]" />; })()}
              <span className="relative mt-1.5 h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_8px_rgba(240,160,255,0.9)]" />
            </div>
          </div>
        ) : (
          // Generated medallion for badges without bespoke artwork
          <div
            className={cn(
              'flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br p-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.55)] transition',
              ring,
              !earned && 'grayscale brightness-[0.5]'
            )}
          >
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-full bg-char/90 text-center">
              {/* inner glow tinted by the tier ring */}
              <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.06] to-transparent" />
              {(() => { const I = iconFor(badge); return <I size={size * 0.32} strokeWidth={1.25} className="text-ember-200 drop-shadow-[0_2px_8px_rgba(240,195,85,0.35)]" />; })()}
              <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full', TIER_DOT[badge.tier] ?? 'bg-amber-700')} title={badge.tier} />
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
