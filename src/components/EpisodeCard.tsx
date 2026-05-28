import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { formatDuration } from '@/lib/mrss';
import type { Episode } from '@/types';

export function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <Link
      href={`/watch/${episode.guid}`}
      className="group block overflow-hidden rounded-lg border-[0.5px] border-ember-400/15 bg-char/80 transition hover:border-ember-400/40"
    >
      <div className="relative aspect-video overflow-hidden bg-leather-dark">
        <Image
          src={episode.thumbnailUrl}
          alt={episode.title}
          fill
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-char via-char/40 to-transparent" />
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-char/80 px-2 py-1 text-[10px] tabular text-ember-100">
          <Clock size={10} strokeWidth={1.5} />
          {formatDuration(episode.durationSec)}
        </div>
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="eyebrow mb-1.5 truncate">
          {episode.seriesTitle} · S{episode.seasonNum} E{episode.episodeNum}
        </div>
        <h3 className="font-display text-[17px] leading-tight font-medium text-paper line-clamp-2">
          {episode.title}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-smoke-400 line-clamp-2">
          {episode.description}
        </p>
      </div>
    </Link>
  );
}
