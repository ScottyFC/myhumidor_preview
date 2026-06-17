'use client';

import { useEffect, useState } from 'react';
import { BrandTile } from '@/components/BrandTile';
import { resolveCigarImage } from '@/lib/cigar-images';

/**
 * Thumbnail for a cigar that stays in sync with admin image changes. Paints the
 * given `src` immediately (no flash), then resolves the live product → brand →
 * fallback image for the slug via the batched resolver and swaps it in.
 */
export function CigarThumb({
  slug, brand, src, className, rounded = 'rounded-lg', fit = 'contain',
}: {
  slug?: string; brand: string; src?: string | null; className?: string; rounded?: string; fit?: 'cover' | 'contain';
}) {
  const [url, setUrl] = useState<string | null>(src ?? null);

  useEffect(() => {
    if (!slug) return;
    return resolveCigarImage(slug, (u) => setUrl(u ?? src ?? null));
  }, [slug, src]);

  return <BrandTile name={brand} src={url} className={className} rounded={rounded} fit={fit} />;
}
