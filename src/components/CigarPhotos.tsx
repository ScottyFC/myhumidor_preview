'use client';

import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { fetchRatingPhotos } from '@/lib/ratings';
import { AutoScrollRow } from '@/components/AutoScrollRow';

/**
 * "Photos of This Cigar" — every photo members attach to their ratings of this
 * cigar, in an endless auto-scrolling carousel. Renders nothing until at least
 * one photo exists.
 */
export function CigarPhotos({ slug }: { slug: string }) {
  const [photos, setPhotos] = useState<Array<{ url: string }> | null>(null);

  useEffect(() => {
    let off = false;
    fetchRatingPhotos(slug).then((p) => !off && setPhotos(p));
    return () => { off = true; };
  }, [slug]);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="eyebrow mb-3 flex items-center gap-1.5">
        <Camera size={11} strokeWidth={1.5} className="text-ember-400" />
        Photos of this cigar
      </h2>
      <AutoScrollRow className="-mx-6 px-6 pb-2">
        {photos.map((p, i) => (
          <div key={i} className="w-44 shrink-0 overflow-hidden rounded-xl ring-1 ring-ember-400/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="Member photo of this cigar" loading="lazy" className="aspect-square w-full object-cover" />
          </div>
        ))}
      </AutoScrollRow>
    </div>
  );
}
