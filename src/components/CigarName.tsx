'use client';

import { useEffect, useState } from 'react';
import { resolveCigarMeta } from '@/lib/cigar-images';

type Mode = 'name' | 'brand' | 'full';

/**
 * Renders a cigar's current name/brand, live-joined from the catalog/overrides
 * by slug. Falls back to the passed snapshot until resolved, so admin renames
 * appear everywhere (profile highlight, humidor, activity) without a stored
 * update. mode: 'name' (default) | 'brand' | 'full' ("Brand Name").
 */
export function CigarName({
  slug, name, brand, mode = 'name', className,
}: { slug?: string; name?: string; brand?: string; mode?: Mode; className?: string }) {
  const initial = mode === 'brand' ? (brand ?? '') : mode === 'full' ? [brand, name].filter(Boolean).join(' ') : (name ?? '');
  const [label, setLabel] = useState(initial);

  useEffect(() => {
    if (!slug) return;
    return resolveCigarMeta(slug, (m) => {
      const b = m.brand ?? brand;
      const n = m.name ?? name;
      setLabel(mode === 'brand' ? (b ?? '') : mode === 'full' ? [b, n].filter(Boolean).join(' ') : (n ?? ''));
    });
  }, [slug, name, brand, mode]);

  return <span className={className}>{label}</span>;
}
