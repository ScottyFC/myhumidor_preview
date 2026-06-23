import episodes from '@/data/burnrate.json';

/** Cigars featured on CigarTV's "Burn Rate", with the episode's Burn Rate score,
 *  air date, and thumbnail. Scores only count once the episode has aired. */
export interface BurnRateEpisode {
  cigarName: string;
  slug: string;
  score: number | null;
  episodeUrl: string;
  airDate: string;   // ISO yyyy-mm-dd
  thumbnail: string;
}

export const BURN_RATE_LOGO = '/shows/burn-rate.png';

export function burnRateEpisodes(): BurnRateEpisode[] {
  return episodes as BurnRateEpisode[];
}

export function hasAired(ep: { airDate: string }): boolean {
  if (!ep.airDate) return false;
  return new Date(ep.airDate + 'T00:00:00') <= new Date();
}

/** The aired, scored Burn Rate result for a cigar slug, if any. */
export function burnRateForSlug(slug: string): BurnRateEpisode | undefined {
  return (episodes as BurnRateEpisode[]).find((e) => e.slug === slug);
}

export function fmtAirDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
