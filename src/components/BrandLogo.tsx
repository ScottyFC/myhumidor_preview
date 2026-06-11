'use client';

import { useEffect, useState } from 'react';
import { BrandTile } from '@/components/BrandTile';

/**
 * Like BrandTile, but when no image is present it tries to fetch the brand's
 * logo (Google image search via /api/brand-logo) before falling back to the
 * monogram tile. Used for cigars that have no artwork of their own.
 */
export function BrandLogo({
  brand, src, className, rounded = 'rounded-lg', fit = 'contain',
}: {
  brand: string; src?: string | null; className?: string; rounded?: string; fit?: 'cover' | 'contain';
}) {
  const [logo, setLogo] = useState<string | null>(src ?? null);

  useEffect(() => {
    if (src) { setLogo(src); return; }
    let off = false;
    fetch(`/api/brand-logo?brand=${encodeURIComponent(brand)}`)
      .then((r) => r.json())
      .then((d) => { if (!off && d?.url) setLogo(d.url); })
      .catch(() => {});
    return () => { off = true; };
  }, [brand, src]);

  return <BrandTile name={brand} src={logo} className={className} rounded={rounded} fit={fit} />;
}
