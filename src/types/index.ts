// ─── EPISODE (parsed from CigarTV MRSS feed) ─────────────────────────────────
export interface Episode {
  guid: string;
  title: string;
  description: string;
  pubDate: string;
  pubDateISO: string;
  categories: string[];
  keywords: string[];
  videoUrl: string;
  durationSec: number;
  thumbnailUrl: string;
  subtitles: Array<{ lang: string; href: string }>;
  rating: string;
  cuePoints: number[];
  series: SeriesId;
  seriesTitle: string;
  seasonNum: number;
  episodeNum: number;
}

export type SeriesId =
  | 'BEHINDBLEND'
  | 'BURNRATE'
  | 'CIGARDOC'
  | 'CIGARESSENTIAL'
  | 'CIGARGUYS'
  | 'CREEKSIDE'
  | 'PRIVADACIGAR'
  | 'UNROLLED';

export interface Series {
  id: SeriesId;
  title: string;
  tagline: string;
  episodes: Episode[];
}

// ─── CIGAR DATABASE ───────────────────────────────────────────────────────────
export interface Cigar {
  id: string;
  slug: string;
  brand: string;
  line: string;
  vitola: string;
  wrapper: string;
  binder?: string;
  filler?: string;
  lengthIn: number;
  ringGauge: number;
  countryOfOrigin: string;
  msrp?: number;
  imageUrl?: string;
  // aggregates (denormalized for read performance)
  ratingCount: number;
  flavorAvg: number;
  burnAvg: number;
  appearanceAvg: number;
  overallAvg: number;
}

// ─── RATINGS ──────────────────────────────────────────────────────────────────
export interface Rating {
  id: string;
  userId: string;
  cigarId: string;
  flavorScore: number; // 1-5
  burnScore: number;   // 1-5
  appearanceScore: number; // 1-5
  overall: number; // computed weighted score, 1-5
  notes?: string;
  tastingNotes: string[];
  createdAt: string;
}

// ─── HUMIDOR ──────────────────────────────────────────────────────────────────
export type HumidorStatus = 'aging' | 'ready' | 'smoked' | 'wishlist';

export interface HumidorEntry {
  id: string;
  userId: string;
  cigar: Cigar;
  quantity: number;
  status: HumidorStatus;
  acquiredAt: string;
  yourRating?: number;
}

// ─── LOUNGES ──────────────────────────────────────────────────────────────────
export interface Lounge {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  verified: boolean;
  phone?: string;
  website?: string;
  hours?: string;
  inventoryCount?: number;
  distanceMi?: number;
}

// ─── FEATURED CIGAR (links cigar → episode at a timecode) ────────────────────
export interface FeaturedCigar {
  episodeGuid: string;
  cigarId: string;
  startTsSec: number;
  endTsSec?: number;
}

// ─── USER ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  handle: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  badgeCount: number;
}
