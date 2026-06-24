// Shared lifecycle badge — identical size everywhere, themed via site tokens (dark/light).
const BASE = 'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide leading-none';

export function CigarStatusBadge({ status, className = '' }: { status?: string | null; className?: string }) {
  if (status === 'coming_soon')
    return <span className={`${BASE} border-ember-400/30 bg-ember-400/10 text-ember-300 ${className}`}>Coming Soon</span>;
  if (status === 'discontinued')
    return <span className={`${BASE} border-smoke-500/40 bg-smoke-500/10 text-smoke-300 ${className}`}>Discontinued</span>;
  return null;
}
