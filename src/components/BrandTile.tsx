import { cn } from '@/lib/utils';
import { safeImg } from '@/lib/img';

// Warm, on-brand background tones; picked deterministically from the name.
const TONES = [
  'from-ember-400/15 to-char',
  'from-leather/20 to-char',
  'from-ember-600/15 to-char',
  'from-smoke-700/20 to-char',
  'from-ember-400/10 to-ink',
  'from-leather-dark/20 to-char',
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '•';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Image with a graceful branded fallback. If `src` is present it renders the
 * image; otherwise it shows a deterministic monogram tile derived from `name`.
 */
export function BrandTile({
  name,
  src,
  className,
  rounded = 'rounded-xl',
  fit = 'cover',
}: {
  name: string;
  src?: string | null;
  className?: string;
  rounded?: string;
  fit?: 'cover' | 'contain';
}) {
  if (src) {
    if (fit === 'contain') {
      // Logos: keep the whole mark visible, centered on a dark tile.
      return (
        <div className={cn('flex items-center justify-center overflow-hidden bg-char/70 p-1.5', rounded, className)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={safeImg(src)} alt={name} className={cn("h-full w-full object-contain", rounded)} loading="lazy" />
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={safeImg(src)} alt={name} className={cn("object-cover", rounded, className)} loading="lazy" />
    );
  }
  const tone = TONES[hash(name) % TONES.length];
  return (
    <div
      className={cn(
        'flex items-center justify-center border-[0.5px] border-ember-400/10 bg-gradient-to-br',
        tone,
        rounded,
        className
      )}
      aria-label={name}
    >
      <span className="font-display font-medium tracking-tight text-ember-100/90" style={{ fontSize: '38%' }}>
        {initials(name)}
      </span>
    </div>
  );
}
