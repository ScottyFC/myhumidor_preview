'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, MapPin, Star, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import type { Episode, Cigar, Lounge } from '@/types';

interface VideoPlayerProps {
  episode: Episode;
  featured: { cigar: Cigar; nearby: Lounge[] } | null;
}

export function VideoPlayer({ episode, featured }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [inHumidor, setInHumidor] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // For HLS streams (we'll switch to these once you transcode), dynamically import.
    if (episode.videoUrl.endsWith('.m3u8') && !video.canPlayType('application/vnd.apple.mpegurl')) {
      (async () => {
        const Hls = (await import('hls.js')).default;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(episode.videoUrl);
          hls.attachMedia(video);
        }
      })();
    }
  }, [episode.videoUrl]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black ring-1 ring-ember-400/10">
      <video
        ref={videoRef}
        src={episode.videoUrl}
        poster={episode.thumbnailUrl}
        controls
        crossOrigin="anonymous"
        className="aspect-video w-full"
      >
        {episode.subtitles.map((sub) => (
          <track
            key={sub.lang}
            kind="subtitles"
            src={sub.href}
            srcLang={sub.lang}
            label={sub.lang.toUpperCase()}
            default={sub.lang === 'en'}
          />
        ))}
      </video>

      {/* Top-left channel mark */}
      <div className="pointer-events-none absolute left-4 top-4 text-[11px] font-medium tracking-widest text-paper/85">
        <span className="text-ember-400">CIGAR</span>TV
      </div>

      {/* Featured cigar lower-third */}
      {showOverlay && featured && (
        <div className="absolute bottom-16 left-4 right-4 z-10 sm:bottom-20 sm:left-6 sm:right-auto sm:max-w-sm">
          <div className="glass relative rounded-md border-l-[3px] border-l-ember-400 p-3 pr-4 animate-fade-up">
            <button
              aria-label="Dismiss featured cigar"
              onClick={() => setShowOverlay(false)}
              className="absolute right-2 top-2 text-smoke-400 hover:text-paper"
            >
              <span className="text-xs">×</span>
            </button>
            <div className="eyebrow mb-1">Now featuring</div>
            <Link
              href={`/cigars/${featured.cigar.slug}`}
              className="block font-display text-base leading-tight font-medium text-paper hover:text-ember-100"
            >
              {featured.cigar.brand} {featured.cigar.line}
              <span className="text-smoke-200 font-normal"> · {featured.cigar.vitola}</span>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-ember-100">
                <Star size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                <span className="tabular font-medium">{featured.cigar.overallAvg.toFixed(1)}</span>
                <span className="text-smoke-400">· {featured.cigar.ratingCount.toLocaleString()} ratings</span>
              </span>
              <span className="inline-flex items-center gap-1 text-ember-100">
                <MapPin size={11} strokeWidth={1.5} className="text-ember-400" />
                {featured.nearby.length} lounges within 5 mi
              </span>
            </div>
            <button
              onClick={() => setInHumidor((v) => !v)}
              className={
                'mt-3 inline-flex items-center gap-1.5 rounded text-xs font-medium transition px-3 py-1.5 ' +
                (inHumidor
                  ? 'bg-ember-600/30 text-ember-100'
                  : 'bg-ember-400 text-paper hover:bg-ember-600')
              }
            >
              {inHumidor ? <Check size={12} strokeWidth={2} /> : <Plus size={12} strokeWidth={2} />}
              {inHumidor ? 'Added to your humidor' : 'Add to humidor'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
