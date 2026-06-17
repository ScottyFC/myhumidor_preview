'use client';

import type { CigarMeta } from '@/app/api/cigar-images/route';

/**
 * Batched client resolver for cigar metadata (image + live brand/name + buy
 * link). List components mount many <CigarThumb>/<CigarName> at once; we collect
 * the slugs requested within a tick and resolve them in a single POST, caching
 * results so re-renders and repeat slugs are free. This is what keeps thumbnails
 * AND names in sync with admin edits without a rebuild.
 */
const cache = new Map<string, CigarMeta>();
const subs = new Map<string, Set<(m: CigarMeta) => void>>();
let queue: string[] = [];
let scheduled = false;

const EMPTY: CigarMeta = { url: null, brand: null, name: null, buyUrl: null, removed: false };

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
    .then(({ map }: { map: Record<string, CigarMeta> }) => {
      for (const slug of batch) {
        const m = map?.[slug] ?? EMPTY;
        cache.set(slug, m);
        subs.get(slug)?.forEach((cb) => cb(m));
      }
    })
    .catch(() => {
      for (const slug of batch) subs.get(slug)?.forEach((cb) => cb(EMPTY));
    });
}

/** Subscribe to a slug's resolved metadata. Returns an unsubscribe fn. */
export function resolveCigarMeta(slug: string, cb: (m: CigarMeta) => void): () => void {
  if (cache.has(slug)) { cb(cache.get(slug)!); return () => {}; }
  if (!subs.has(slug)) subs.set(slug, new Set());
  const set = subs.get(slug)!;
  set.add(cb);
  queue.push(slug);
  if (!scheduled) { scheduled = true; setTimeout(flush, 0); }
  return () => set.delete(cb);
}

/** Back-compat: image-only subscription used by CigarThumb. */
export function resolveCigarImage(slug: string, cb: (url: string | null) => void): () => void {
  return resolveCigarMeta(slug, (m) => cb(m.url));
}
