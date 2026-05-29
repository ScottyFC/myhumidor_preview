/**
 * MRSS feed parser for the CigarTV channel manifest.
 *
 * The feed lives at NEXT_PUBLIC_MRSS_URL in production, or /public/feed.xml in
 * local dev. We cache parsed results with Next.js' `fetch` revalidation so the
 * watch page doesn't re-parse on every request.
 */

import { XMLParser } from 'fast-xml-parser';
import type { Episode, Series, SeriesId } from '@/types';

const SERIES_META: Record<SeriesId, { title: string; tagline: string }> = {
  BEHINDBLEND: {
    title: 'Behind the Blend',
    tagline: 'Conversations with the people who make the cigars.',
  },
  BURNRATE: {
    title: 'Burn Rate',
    tagline: 'Quick takes, fast reviews, real opinions.',
  },
  CIGARDOC: {
    title: 'Cigar Doc',
    tagline: 'Long-form documentary on the world of premium cigar.',
  },
  CIGARESSENTIAL: {
    title: 'Cigar Essential',
    tagline: 'The fundamentals — vitolas, wrappers, and how to smoke.',
  },
  CIGARGUYS: {
    title: 'Cigar Guys',
    tagline: 'Roundtable banter from the lounge.',
  },
  CREEKSIDE: {
    title: 'Creekside',
    tagline: 'On location at the most storied lounges in America.',
  },
  PRIVADACIGAR: {
    title: 'Privada Cigar',
    tagline: 'Inside the Privada Cigar Club world.',
  },
  UNROLLED: {
    title: 'Unrolled',
    tagline: 'Travel and tour the factories where the leaf becomes the smoke.',
  },
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
  isArray: (name) => ['item', 'media:subTitle'].includes(name),
});

interface RawItem {
  guid: { '#text': string };
  'media:title': { '#text': string };
  'media:description': string;
  pubDate: string;
  'media:category': { '#text': string };
  'media:keywords': string;
  'media:content': {
    '@_url': string;
    '@_duration': string;
  };
  'media:thumbnail': { '@_url': string };
  'media:group'?: {
    'media:subTitle'?: Array<{ '@_lang': string; '@_href': string }>;
  };
  'media:rating': { '#text': string };
  'xumo:cuePoints': string | number;
  'xumo:episodic': {
    'xumo:seriesId': string;
    'xumo:seasonNum': number | string;
    'xumo:episodeNum': number | string;
  };
}

function normalizeSeriesId(raw: string): SeriesId {
  const trimmed = raw.split(';')[0].trim().toUpperCase().replace(/\s+/g, '');
  if (trimmed in SERIES_META) return trimmed as SeriesId;
  // Default fallback so a typo in the feed doesn't crash everything
  return 'CIGARESSENTIAL';
}

function parsePubDate(s: string): string {
  // Feed uses MM/DD/YY — coerce to ISO 8601
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
  if (!m) return new Date().toISOString();
  const [, mo, d, yy] = m;
  const year = 2000 + parseInt(yy, 10);
  const iso = new Date(Date.UTC(year, parseInt(mo, 10) - 1, parseInt(d, 10))).toISOString();
  return iso;
}

function parseCuePoints(raw: string | number): number[] {
  if (typeof raw === 'number') return [raw];
  return String(raw)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

function toHttps(url: string): string {
  // CigarTV's CloudFront feed is http://, upgrade to https for browser playback
  return url.replace(/^http:/, 'https:');
}

function itemToEpisode(item: RawItem): Episode {
  const seriesId = normalizeSeriesId(item['xumo:episodic']['xumo:seriesId']);
  const subs = item['media:group']?.['media:subTitle'] ?? [];

  return {
    guid: String(item.guid['#text'] ?? item.guid),
    title: stripSeriesPrefix(String(item['media:title']['#text'] ?? item['media:title'])),
    description: String(item['media:description'] ?? ''),
    pubDate: String(item.pubDate),
    pubDateISO: parsePubDate(String(item.pubDate)),
    categories: String(item['media:category']['#text'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    keywords: String(item['media:keywords'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    videoUrl: toHttps(item['media:content']['@_url']),
    durationSec: parseInt(String(item['media:content']['@_duration']), 10) || 0,
    thumbnailUrl: toHttps(item['media:thumbnail']['@_url']),
    subtitles: subs.map((s) => ({ lang: s['@_lang'], href: toHttps(s['@_href']) })),
    rating: String(item['media:rating']['#text'] ?? item['media:rating']),
    cuePoints: parseCuePoints(item['xumo:cuePoints']),
    series: seriesId,
    seriesTitle: SERIES_META[seriesId].title,
    seasonNum: parseInt(String(item['xumo:episodic']['xumo:seasonNum']), 10) || 1,
    episodeNum: parseInt(String(item['xumo:episodic']['xumo:episodeNum']), 10) || 1,
  };
}

function stripSeriesPrefix(title: string): string {
  // Titles in the feed read "Behind The Blend - Lynn Hawkins..." — strip the
  // prefix so episode cards don't repeat the series name next to the series header.
  return title.replace(/^[^-]+\s*-\s*/, '').trim() || title;
}

/**
 * Fetch and parse the MRSS feed. Cached for 1 hour by Next.js fetch.
 */
export async function fetchEpisodes(): Promise<Episode[]> {
  const feedUrl =
    process.env.NEXT_PUBLIC_MRSS_URL ||
    (typeof window === 'undefined'
      ? new URL('/feed.xml', `http://localhost:${process.env.PORT ?? 3000}`).toString()
      : '/feed.xml');

  const xml = await fetchXmlSafely(feedUrl);
  return parseFeedXml(xml);
}

async function fetchXmlSafely(feedUrl: string): Promise<string> {
  // Server: try fetch first, then fall back to filesystem read (for dev where the
  // dev server may not yet be answering /feed.xml during a Server Component render).
  try {
    const res = await fetch(feedUrl, { next: { revalidate: 3600 } });
    if (res.ok) return await res.text();
  } catch {
    // fall through
  }
  if (typeof window === 'undefined') {
    const fs = await import('fs/promises');
    const path = await import('path');
    return fs.readFile(path.join(process.cwd(), 'public', 'feed.xml'), 'utf-8');
  }
  throw new Error('Could not load MRSS feed from ' + feedUrl);
}

export function parseFeedXml(xml: string): Episode[] {
  const json = parser.parse(xml);
  const items: RawItem[] = json?.rss?.channel?.item ?? [];
  return items.map(itemToEpisode);
}

/**
 * Group episodes by series, sorted by season + episode number.
 */
export function groupBySeries(episodes: Episode[]): Series[] {
  const byId = new Map<SeriesId, Episode[]>();
  for (const ep of episodes) {
    const arr = byId.get(ep.series) ?? [];
    arr.push(ep);
    byId.set(ep.series, arr);
  }
  return Array.from(byId.entries())
    .map<Series>(([id, eps]) => ({
      id,
      title: SERIES_META[id].title,
      tagline: SERIES_META[id].tagline,
      episodes: eps.sort((a, b) =>
        a.seasonNum !== b.seasonNum ? a.seasonNum - b.seasonNum : a.episodeNum - b.episodeNum
      ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function findEpisodeByGuid(episodes: Episode[], guid: string): Episode | undefined {
  return episodes.find((e) => e.guid === guid);
}

/**
 * Most recent episodes by publish date. We surface these as a "this week"
 * reference on the site (the VOD library itself isn't hosted here).
 */
export function recentEpisodes(episodes: Episode[], limit = 8): Episode[] {
  return [...episodes]
    .sort((a, b) => b.pubDateISO.localeCompare(a.pubDateISO))
    .slice(0, limit);
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export { SERIES_META };
