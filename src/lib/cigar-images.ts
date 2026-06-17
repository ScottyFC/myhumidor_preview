'use client';

/**
 * Batched client resolver for cigar thumbnails. Many list components mount a
 * <CigarThumb> at once; instead of one request each, we collect the slugs
 * requested within a tick and resolve them in a single POST /api/cigar-images,
 * caching results so re-renders and repeat slugs are free.
 */
const cache = new Map<string, string | null>();
const subs = new Map<string, Set<(u: string | null) => void>>();
let queue: string[] = [];
let scheduled = false;

function flush() {
  const batch = Array.from(new Set(queue));
  queue = [];
  scheduled = false;
  if (batch.length === 0) return;
  fetch('/api/cigar-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slugs: batch }),
  })
    .then((r) => r.json())
    .then(({ map }: { map: Record<string, string | null> }) => {
      for (const slug of batch) {
        const u = map?.[slug] ?? null;
        cache.set(slug, u);
        subs.get(slug)?.forEach((cb) => cb(u));
      }
    })
    .catch(() => {
      for (const slug of batch) subs.get(slug)?.forEach((cb) => cb(null));
    });
}

/** Subscribe to a slug's resolved image. Returns an unsubscribe fn. */
export function resolveCigarImage(slug: string, cb: (url: string | null) => void): () => void {
  if (cache.has(slug)) { cb(cache.get(slug)!); return () => {}; }
  if (!subs.has(slug)) subs.set(slug, new Set());
  const set = subs.get(slug)!;
  set.add(cb);
  queue.push(slug);
  if (!scheduled) { scheduled = true; setTimeout(flush, 0); }
  return () => set.delete(cb);
}
