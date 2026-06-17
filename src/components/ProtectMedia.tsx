'use client';

import { useEffect } from 'react';

/**
 * Best-effort deterrent against casually copying images from cigar/lounge pages:
 * blocks the context menu and drag on <img> elements and disables image
 * selection. (Determined users can still get assets via dev tools — this just
 * stops right-click "Save image" / "Copy image address" and drag-to-save.)
 */
export function ProtectMedia() {
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === 'IMG') e.preventDefault();
    };
    const onDrag = (e: DragEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === 'IMG') e.preventDefault();
    };
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('dragstart', onDrag);
    document.documentElement.classList.add('no-img-copy');
    return () => {
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('dragstart', onDrag);
      document.documentElement.classList.remove('no-img-copy');
    };
  }, []);

  return null;
}
