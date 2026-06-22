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
    <div className="relative -mx-6 mb-6 overflow-hidden border-y border-ember-400/30 bg-gradient-to-r from-ember-400/20 via-ember-300/[0.08] to-ember-400/20 shadow-[0_2px_28px_-10px_rgba(240,195,85,0.45)] sm:mx-0 sm:rounded-2xl sm:border">
      {/* animated sheen sweep */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[sheen_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {/* shimmer hairlines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember-300 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-ember-400/40 to-transparent" />

      <div className="relative flex items-center gap-3 px-6 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ember-200 to-ember-400 text-paper shadow-[0_0_18px_rgba(240,195,85,0.55)] ring-1 ring-ember-200/70">
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <div className="bg-gradient-to-r from-ember-300 via-ember-200 to-ember-400 bg-clip-text font-display text-sm font-bold uppercase tracking-[0.22em] text-transparent dark:from-ember-100 dark:via-ember-50 dark:to-ember-200">{label}</div>
          <div className="truncate text-xs text-smoke-400">{blurb}</div>
        </div>
        <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-full border-[0.5px] border-ember-400/40 bg-char/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-ember-200 shadow-sm sm:inline-flex">
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
