import { Armchair, ShoppingBag, Store } from 'lucide-react';

export type VenueType = 'lounge' | 'retail' | 'both' | undefined | null;

/**
 * Tag that tells visitors whether a place is a sit-down cigar lounge you can
 * smoke at, or a retailer that sells cigars but isn't a smoking venue (e.g. a
 * liquor store). Helps people not show up to a Total Wine expecting a lounge.
 */
export function VenueTag({ type, size = 'md' }: { type: VenueType; size?: 'sm' | 'md' }) {
  const t = type ?? 'lounge';
  const cfg = {
    lounge: { icon: Armchair, label: 'Sit-down lounge', cls: 'border-ember-400/40 bg-ember-400/10 text-ember-100' },
    both: { icon: Store, label: 'Lounge & retailer', cls: 'border-ember-400/40 bg-ember-400/10 text-ember-100' },
    retail: { icon: ShoppingBag, label: 'Retailer · no on-site smoking', cls: 'border-smoke-500/40 bg-smoke-800/40 text-smoke-200' },
  }[t === 'retail' ? 'retail' : t === 'both' ? 'both' : 'lounge'];
  const Icon = cfg.icon;
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-[0.5px] ${cfg.cls} ${pad} font-medium uppercase tracking-wide`}>
      <Icon size={size === 'sm' ? 10 : 12} strokeWidth={1.5} /> {cfg.label}
    </span>
  );
}
