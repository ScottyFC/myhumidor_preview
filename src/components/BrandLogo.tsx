'use client';

import { useEffect, useState } from 'react';
import { BrandTile } from '@/components/BrandTile';

/**
 * Brand/cigar image with the product → brand → fallback hierarchy.
 * - With a `slug`, it always resolves live via /api/brand-logo (product image,
 *   then brand image, then logo.dev), so admin uploads/overwrites reflect on
 *   refresh. `src` is used only as the initial paint to avoid a flash.
 * - Without a `slug` (e.g. lounges), it uses `src`, falling back to the brand
 *   lookup only when there's no src.
 */
export function BrandLogo({
  brand, src, slug, className, rounded = 'rounded-lg', fit = 'contain',
}: {
  brand: string; src?: string | null; slug?: string; className?: string; rounded?: string; fit?: 'cover' | 'contain';
}) {
  const [logo, setLogo] = useState<string | null>(src ?? null);

  useEffect(() => {
    // No slug and we already have an image → keep it (lounge tiles, etc.).
    if (!slug && src) { setLogo(src); return; }
    let off = false;
    const qs = new URLSearchParams({ brand });
    if (slug) qs.set('slug', slug);
    fetch(`/api/brand-logo?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!off && d?.url) setLogo(d.url); })
      .catch(() => {});
    return () => { off = true; };
  }, [brand, src, slug]);

  return <BrandTile name={brand} src={logo} className={className} rounded={rounded} fit={fit} />;
}
