'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Subtle per-section color variation: sets --page-accent (an RGB triplet) based
 * on the route, which globals.css uses for a faint top ambient glow. Keeps the
 * "after-hours editorial" palette — just shifts the warmth a touch per section
 * so pages feel distinct. Works on web and in the app.
 */
const ACCENTS: { test: (p: string) => boolean; rgb: string }[] = [
  { test: (p) => p.startsWith('/top') || p.startsWith('/cigars') || p.startsWith('/brands'), rgb: '193, 116, 60' }, // ember/copper
  { test: (p) => p.startsWith('/lounges') || p.startsWith('/map'), rgb: '176, 141, 87' },                           // leather
  { test: (p) => p.startsWith('/humidor'), rgb: '212, 175, 110' },                                                  // aged gold
  { test: (p) => p.startsWith('/feed'), rgb: '150, 134, 122' },                                                     // smoke
  { test: (p) => p.startsWith('/search'), rgb: '203, 162, 92' },                                                    // amber
  { test: (p) => p.startsWith('/profile') || p.startsWith('/u/') || p.startsWith('/settings'), rgb: '224, 196, 140' },
  { test: (p) => p.startsWith('/admin') || p.startsWith('/dashboard'), rgb: '160, 124, 84' },
];
const DEFAULT = '240, 195, 85'; // brand gold

export function PageAccent() {
  const pathname = usePathname() || '/';
  useEffect(() => {
    const rgb = ACCENTS.find((a) => a.test(pathname))?.rgb ?? DEFAULT;
    document.documentElement.style.setProperty('--page-accent', rgb);
  }, [pathname]);
  return null;
}
