import { NextResponse } from 'next/server';
import { fetchEpisodes, groupBySeries } from '@/lib/mrss';

export const revalidate = 3600;

/**
 * GET /api/episodes
 *
 * Returns the full parsed CigarTV catalog as JSON. Filter by series with
 * ?series=BEHINDBLEND. Used by the mobile app and TV stick clients.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const series = searchParams.get('series');

  const episodes = await fetchEpisodes();

  if (series) {
    const filtered = episodes.filter((e) => e.series === series.toUpperCase());
    return NextResponse.json({ count: filtered.length, episodes: filtered });
  }

  const grouped = groupBySeries(episodes);
  return NextResponse.json({
    totalEpisodes: episodes.length,
    seriesCount: grouped.length,
    series: grouped.map((s) => ({
      id: s.id,
      title: s.title,
      tagline: s.tagline,
      episodeCount: s.episodes.length,
    })),
  });
}
