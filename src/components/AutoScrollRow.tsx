'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Wraps a horizontal row and gently auto-scrolls it, looping back to the start.
 * Pauses on hover / touch / when the tab is hidden, and respects
 * prefers-reduced-motion.
 */
export function AutoScrollRow({
  children,
  className,
  speed = 0.4, // px per frame
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const step = () => {
      if (!paused.current && el.scrollWidth > el.clientWidth + 4) {
        const max = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= max - 1) el.scrollLeft = 0;
        else el.scrollLeft += speed;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const pause = () => (paused.current = true);
    const resume = () => (paused.current = false);
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume, { passive: true });
    const vis = () => (paused.current = document.hidden);
    document.addEventListener('visibilitychange', vis);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [speed]);

  return (
    <div ref={ref} className={cn('flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {children}
    </div>
  );
}
