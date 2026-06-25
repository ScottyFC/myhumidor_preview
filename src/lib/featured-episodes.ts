import 'server-only';
import { fetchEpisodes } from './mrss';
import { burnRateForSlug, hasAired, BURN_RATE_LOGO } from './burnrate';

export interface FeaturedEpisode {
  title: string;
  series: string;
  thumbnail: string;
  url: string;
  score?: number;
  airDate?: string;
}

/**
 * Episodes that feature a given cigar, for the "Featured on" carousel:
 *  - an exact Burn Rate match by slug (the reliable, static mapping), if aired
 *  - plus any MRSS episodes whose title/description mentions the brand or cigar
 * Network failures fetching the feed degrade gracefully to just Burn Rate.
 */
export async function featuredEpisodesForCigar(
  opts: { slug: string; brand: string; name: string },
  limit = 8,
): Promise<FeaturedEpisode[]> {
  const out: FeaturedEpisode[] = [];
  const seen = new Set<string>();
  const push = (e: FeaturedEpisode) => { const k = e.url || e.title; if (k && !seen.has(k)) { seen.add(k); out.push(e); } };

  const br = burnRateForSlug(opts.slug);
  if (br && hasAired(br)) push({ title: br.cigarName, series: 'Burn Rate', thumbnail: br.thumbnail || BURN_RATE_LOGO, url: br.episodeUrl, score: br.score ?? undefined, airDate: br.airDate });

  try {
    const eps = await fetchEpisodes();
    const brand = opts.brand.trim().toLowerCase();
    const name = opts.name.trim().toLowerCase();
    for (const e of eps) {
      const hay = `${e.title} ${e.description}`.toLowerCase();
      if ((brand.length > 2 && hay.includes(brand)) || (name.length > 4 && hay.includes(name))) {
        push({ title: e.title, series: e.seriesTitle, thumbnail: e.thumbnailUrl, url: e.videoUrl });
      }
    }
  } catch { /* feed unreachable — Burn Rate still shows */ }

  return out.slice(0, limit);
}
