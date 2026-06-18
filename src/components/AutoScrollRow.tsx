'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Horizontal row that auto-scrolls and loops *endlessly* — when the row
 * overflows we render a second, identical copy of the children and wrap the
 * scroll position by exactly one copy's width, so the reset is invisible
 * (no snap back to the first card). Pauses on hover / touch / hidden tab and
 * respects prefers-reduced-motion. Non-overflowing rows render a single copy
 * and don't animate.
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
  const [loop, setLoop] = useState(false);

  // Decide whether the content overflows (→ duplicate + loop).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const first = el.firstElementChild as HTMLElement | null;
      const copyWidth = first?.scrollWidth ?? el.scrollWidth;
      setLoop(copyWidth > el.clientWidth + 8);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !loop) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const step = () => {
      if (!paused.current) {
        const half = el.scrollWidth / 2; // width of one copy (+ seam gap)
        el.scrollLeft += speed;
        if (el.scrollLeft >= half) el.scrollLeft -= half; // seamless wrap
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
  }, [loop, speed]);

  return (
    <div
      ref={ref}
      className={cn('flex gap-4 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
    >
      <div className="flex shrink-0 gap-4">{children}</div>
      {loop && (
        <div className="flex shrink-0 gap-4" aria-hidden>
          {children}
        </div>
      )}
    </div>
  );
}
