import { Crown, BadgeCheck } from 'lucide-react';

/**
 * A distinctive banner strip that sits at the top of a profile/lounge page to
 * mark elevated accounts — Verified Aficionado members and Certified lounges —
 * so they read as clearly special versus regular members and lounges.
 */
export function EliteBanner({ kind }: { kind: 'aficionado' | 'certified' }) {
  const isAf = kind === 'aficionado';
  const label = isAf ? 'Verified Aficionado' : 'Certified Lounge';
  const blurb = isAf
    ? 'A recognized member of the MyHumidor community'
    : 'An officially certified MyHumidor partner lounge';
  const Icon = isAf ? Crown : BadgeCheck;

  return (
    <div className="relative -mx-6 mb-6 overflow-hidden sm:mx-0 sm:rounded-2xl">
      {/* layered gradient + glow */}
      <div className={`absolute inset-0 ${isAf
        ? 'bg-gradient-to-r from-leather-deep via-ember-600/40 to-leather-deep'
        : 'bg-gradient-to-r from-leather-deep via-teal-700/30 to-leather-deep'}`} />
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-20%,rgba(240,195,85,0.28),transparent_60%)]" />
      {/* shimmer hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember-300/70 to-transparent" />

      <div className="relative flex items-center gap-3 px-6 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember-400 text-paper shadow-[0_0_20px_rgba(240,195,85,0.5)] ring-1 ring-ember-200/60">
          <Icon size={17} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-ember-50">{label}</div>
          <div className="truncate text-xs text-ember-100/70">{blurb}</div>
        </div>
        <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-full border-[0.5px] border-ember-300/40 bg-char/30 px-2.5 py-1 text-[10px] uppercase tracking-widest text-ember-100 sm:inline-flex">
          <Icon size={11} strokeWidth={2} /> MyHumidor
        </span>
      </div>
    </div>
  );
}

/** Header glow/ring classes to apply when an account is elevated. */
export function eliteHeaderClass(elite: boolean): string {
  return elite
    ? 'rounded-2xl border border-ember-400/25 bg-gradient-to-b from-ember-400/[0.06] to-transparent px-5 py-5 shadow-[0_0_40px_-8px_rgba(240,195,85,0.25)]'
    : '';
}
