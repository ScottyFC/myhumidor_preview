import { cn } from '@/lib/utils';

// Warm, on-brand background tones; picked deterministically from the name.
const TONES = [
  'from-[#3A2417] to-[#1C120B]',
  'from-[#4A2E18] to-[#241509]',
  'from-[#3F2A2A] to-[#1E1212]',
  'from-[#2E2A18] to-[#16140B]',
  'from-[#42301C] to-[#1F160C]',
  'from-[#332016] to-[#180E08]',
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
  rounded = 'rounded-lg',
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
        <div className={cn('flex items-center justify-center bg-char/70 p-1.5', rounded, className)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={name} className="h-full w-full object-contain" loading="lazy" />
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className={cn('object-cover', rounded, className)} loading="lazy" />
    );
  }
  const tone = TONES[hash(name) % TONES.length];
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-gradient-to-br',
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
