/**
 * Mock data used while Supabase isn't yet populated. Mirrors the shape of the
 * production schema in supabase/schema.sql so it's a drop-in replacement.
 */

import type { Cigar, HumidorEntry, Lounge, User, FeaturedCigar } from '@/types';

export const MOCK_USER: User = {
  id: 'usr_001',
  handle: 'sean.tampa',
  displayName: 'Sean',
  email: 'sean@cigartv.com',
  avatarUrl: undefined,
  badgeCount: 7,
};

export const MOCK_CIGARS: Cigar[] = [
  {
    id: 'cig_padron_1964_exclusivo',
    slug: 'padron-1964-anniversary-exclusivo',
    brand: 'Padrón',
    line: '1964 Anniversary',
    vitola: 'Exclusivo',
    wrapper: 'Maduro',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 5.5,
    ringGauge: 50,
    countryOfOrigin: 'Nicaragua',
    msrp: 19,
    ratingCount: 2412,
    flavorAvg: 4.7,
    burnAvg: 4.5,
    appearanceAvg: 4.6,
    overallAvg: 4.6,
  },
  {
    id: 'cig_my_father_le_bijou',
    slug: 'my-father-le-bijou-1922-torpedo',
    brand: 'My Father',
    line: 'Le Bijou 1922',
    vitola: 'Torpedo',
    wrapper: 'Habano Oscuro',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 6,
    ringGauge: 54,
    countryOfOrigin: 'Nicaragua',
    msrp: 13,
    ratingCount: 1893,
    flavorAvg: 4.6,
    burnAvg: 4.4,
    appearanceAvg: 4.5,
    overallAvg: 4.5,
  },
  {
    id: 'cig_fuente_opus_x',
    slug: 'fuente-fuente-opus-x-perfeccion-no-5',
    brand: 'Arturo Fuente',
    line: 'Fuente Fuente OpusX',
    vitola: 'Perfección No. 5',
    wrapper: 'Dominican',
    binder: 'Dominican',
    filler: 'Dominican',
    lengthIn: 5.25,
    ringGauge: 50,
    countryOfOrigin: 'Dominican Republic',
    msrp: 24,
    ratingCount: 3104,
    flavorAvg: 4.8,
    burnAvg: 4.7,
    appearanceAvg: 4.8,
    overallAvg: 4.8,
  },
  {
    id: 'cig_oliva_serie_v',
    slug: 'oliva-serie-v-torpedo',
    brand: 'Oliva',
    line: 'Serie V',
    vitola: 'Torpedo',
    wrapper: 'Habano Sun-Grown',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 6,
    ringGauge: 52,
    countryOfOrigin: 'Nicaragua',
    msrp: 8.5,
    ratingCount: 4221,
    flavorAvg: 4.3,
    burnAvg: 4.2,
    appearanceAvg: 4.2,
    overallAvg: 4.3,
  },
  {
    id: 'cig_drew_estate_liga_9',
    slug: 'drew-estate-liga-privada-no-9-toro',
    brand: 'Drew Estate',
    line: 'Liga Privada No. 9',
    vitola: 'Toro',
    wrapper: 'Connecticut Broadleaf',
    binder: 'Brazilian',
    filler: 'Nicaragua, Honduras',
    lengthIn: 6,
    ringGauge: 52,
    countryOfOrigin: 'Nicaragua',
    msrp: 14,
    ratingCount: 2876,
    flavorAvg: 4.5,
    burnAvg: 4.4,
    appearanceAvg: 4.6,
    overallAvg: 4.5,
  },
  {
    id: 'cig_west_tampa_red',
    slug: 'west-tampa-tobacco-red',
    brand: 'West Tampa Tobacco Co',
    line: 'Red',
    vitola: 'Robusto',
    wrapper: 'Habano',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 5,
    ringGauge: 52,
    countryOfOrigin: 'Nicaragua',
    msrp: 9.5,
    ratingCount: 412,
    flavorAvg: 4.4,
    burnAvg: 4.3,
    appearanceAvg: 4.4,
    overallAvg: 4.4,
  },
  {
    id: 'cig_padron_family_reserve_50',
    slug: 'padron-family-reserve-no-50',
    brand: 'Padrón',
    line: 'Family Reserve',
    vitola: 'No. 50',
    wrapper: 'Maduro',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 5.5,
    ringGauge: 54,
    countryOfOrigin: 'Nicaragua',
    msrp: 34,
    ratingCount: 1640,
    flavorAvg: 4.9,
    burnAvg: 4.8,
    appearanceAvg: 4.8,
    overallAvg: 4.9,
  },
  {
    id: 'cig_aging_room_quattro',
    slug: 'aging-room-quattro-nicaragua-maestro',
    brand: 'Aging Room',
    line: 'Quattro Nicaragua',
    vitola: 'Maestro',
    wrapper: 'Habano',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 5.5,
    ringGauge: 54,
    countryOfOrigin: 'Dominican Republic',
    msrp: 11,
    ratingCount: 980,
    flavorAvg: 4.6,
    burnAvg: 4.5,
    appearanceAvg: 4.5,
    overallAvg: 4.6,
  },
  {
    id: 'cig_ep_carrillo_pledge',
    slug: 'ep-carrillo-pledge-prequel',
    brand: 'E.P. Carrillo',
    line: 'Pledge',
    vitola: 'Prequel',
    wrapper: 'Connecticut Habano',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 6,
    ringGauge: 50,
    countryOfOrigin: 'Dominican Republic',
    msrp: 13,
    ratingCount: 1210,
    flavorAvg: 4.7,
    burnAvg: 4.6,
    appearanceAvg: 4.6,
    overallAvg: 4.7,
  },
  {
    id: 'cig_davidoff_late_hour',
    slug: 'davidoff-winston-churchill-the-late-hour-robusto',
    brand: 'Davidoff',
    line: 'Winston Churchill The Late Hour',
    vitola: 'Robusto',
    wrapper: 'Ecuador Habano',
    binder: 'Mexico',
    filler: 'Dominican, Nicaragua',
    lengthIn: 5,
    ringGauge: 48,
    countryOfOrigin: 'Dominican Republic',
    msrp: 21,
    ratingCount: 870,
    flavorAvg: 4.6,
    burnAvg: 4.7,
    appearanceAvg: 4.7,
    overallAvg: 4.6,
  },
  {
    id: 'cig_lfd_andalusian_bull',
    slug: 'la-flor-dominicana-andalusian-bull',
    brand: 'La Flor Dominicana',
    line: 'Andalusian Bull',
    vitola: 'Figurado',
    wrapper: 'Ecuador Habano',
    binder: 'Dominican',
    filler: 'Dominican',
    lengthIn: 6.5,
    ringGauge: 58,
    countryOfOrigin: 'Dominican Republic',
    msrp: 16,
    ratingCount: 1520,
    flavorAvg: 4.8,
    burnAvg: 4.6,
    appearanceAvg: 4.7,
    overallAvg: 4.7,
  },
  {
    id: 'cig_tatuaje_brown_label',
    slug: 'tatuaje-brown-label-noella',
    brand: 'Tatuaje',
    line: 'Brown Label',
    vitola: 'Noella',
    wrapper: 'Ecuador Habano',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 5.13,
    ringGauge: 42,
    countryOfOrigin: 'Nicaragua',
    msrp: 9,
    ratingCount: 1340,
    flavorAvg: 4.5,
    burnAvg: 4.5,
    appearanceAvg: 4.4,
    overallAvg: 4.5,
  },
  {
    id: 'cig_perdomo_20th',
    slug: 'perdomo-20th-anniversary-maduro-robusto',
    brand: 'Perdomo',
    line: '20th Anniversary Maduro',
    vitola: 'Robusto',
    wrapper: 'Nicaragua Maduro',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 5,
    ringGauge: 56,
    countryOfOrigin: 'Nicaragua',
    msrp: 10,
    ratingCount: 1990,
    flavorAvg: 4.5,
    burnAvg: 4.6,
    appearanceAvg: 4.5,
    overallAvg: 4.5,
  },
  {
    id: 'cig_ashton_vsg',
    slug: 'ashton-vsg-robusto',
    brand: 'Ashton',
    line: 'Virgin Sun Grown',
    vitola: 'Robusto',
    wrapper: 'Ecuador Sun Grown',
    binder: 'Dominican',
    filler: 'Dominican',
    lengthIn: 5.5,
    ringGauge: 50,
    countryOfOrigin: 'Dominican Republic',
    msrp: 14,
    ratingCount: 1760,
    flavorAvg: 4.6,
    burnAvg: 4.5,
    appearanceAvg: 4.6,
    overallAvg: 4.6,
  },
  {
    id: 'cig_rocky_patel_decade',
    slug: 'rocky-patel-decade-toro',
    brand: 'Rocky Patel',
    line: 'Decade',
    vitola: 'Toro',
    wrapper: 'Ecuador Sumatra',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    lengthIn: 6.5,
    ringGauge: 52,
    countryOfOrigin: 'Honduras',
    msrp: 12,
    ratingCount: 1430,
    flavorAvg: 4.4,
    burnAvg: 4.4,
    appearanceAvg: 4.5,
    overallAvg: 4.4,
  },
];

export const MOCK_HUMIDOR: HumidorEntry[] = [
  {
    id: 'he_001',
    userId: MOCK_USER.id,
    cigar: MOCK_CIGARS[0],
    quantity: 2,
    status: 'ready',
    acquiredAt: '2026-04-12T00:00:00Z',
    yourRating: 4.7,
  },
  {
    id: 'he_002',
    userId: MOCK_USER.id,
    cigar: MOCK_CIGARS[1],
    quantity: 1,
    status: 'ready',
    acquiredAt: '2026-04-22T00:00:00Z',
    yourRating: 4.4,
  },
  {
    id: 'he_003',
    userId: MOCK_USER.id,
    cigar: MOCK_CIGARS[2],
    quantity: 3,
    status: 'aging',
    acquiredAt: '2026-02-01T00:00:00Z',
    yourRating: 4.8,
  },
  {
    id: 'he_004',
    userId: MOCK_USER.id,
    cigar: MOCK_CIGARS[3],
    quantity: 4,
    status: 'ready',
    acquiredAt: '2026-05-01T00:00:00Z',
    yourRating: 4.2,
  },
  {
    id: 'he_005',
    userId: MOCK_USER.id,
    cigar: MOCK_CIGARS[4],
    quantity: 2,
    status: 'ready',
    acquiredAt: '2026-05-14T00:00:00Z',
    yourRating: 4.5,
  },
];

export const MOCK_LOUNGES: Lounge[] = [
  {
    id: 'lng_001',
    slug: 'corona-cigar-orlando',
    name: 'Corona Cigar Co.',
    address: '7792 W Sand Lake Rd',
    city: 'Orlando',
    state: 'FL',
    lat: 28.4441,
    lng: -81.477,
    verified: true,
    phone: '(407) 351-0991',
    website: 'coronacigar.com',
    hours: 'Mon–Sat 10am–11pm, Sun 11am–10pm',
    inventoryCount: 412,
    distanceMi: 2.3,
  },
  {
    id: 'lng_002',
    slug: 'west-tampa-tobacco-ybor',
    name: 'West Tampa Tobacco Co.',
    address: '2103 N 22nd St',
    city: 'Tampa',
    state: 'FL',
    lat: 27.9774,
    lng: -82.4256,
    verified: true,
    phone: '(813) 247-8755',
    website: 'westtampatobaccoco.com',
    hours: 'Mon–Sat 10am–10pm',
    inventoryCount: 198,
    distanceMi: 4.1,
  },
  {
    id: 'lng_003',
    slug: 'king-corona-ybor',
    name: 'King Corona Cigars',
    address: '1523 E 7th Ave',
    city: 'Tampa',
    state: 'FL',
    lat: 27.9605,
    lng: -82.4407,
    verified: true,
    phone: '(813) 241-9109',
    hours: 'Daily 10am–12am',
    inventoryCount: 287,
    distanceMi: 4.8,
  },
  {
    id: 'lng_004',
    slug: 'tabanero-cigars-tampa',
    name: 'Tabanero Cigars',
    address: '1601 E 7th Ave',
    city: 'Tampa',
    state: 'FL',
    lat: 27.9605,
    lng: -82.4391,
    verified: false,
    hours: 'Daily 10am–11pm',
    inventoryCount: 145,
    distanceMi: 4.9,
  },
];

/**
 * Mock featured-cigar mappings. In production these come from authored metadata
 * stored alongside the episode (your editorial team tags cigars at timestamps
 * during post-production).
 */
export const MOCK_FEATURED: FeaturedCigar[] = [
  { episodeGuid: 'BEHINDBLEND01001', cigarId: 'cig_padron_1964_exclusivo', startTsSec: 0 },
  { episodeGuid: 'BEHINDBLEND01002', cigarId: 'cig_my_father_le_bijou', startTsSec: 0 },
  { episodeGuid: 'BEHINDBLEND01003', cigarId: 'cig_west_tampa_red', startTsSec: 0 },
  { episodeGuid: 'UNROLLED03010', cigarId: 'cig_fuente_opus_x', startTsSec: 0 },
];

export function findCigarById(id: string): Cigar | undefined {
  return MOCK_CIGARS.find((c) => c.id === id);
}

export function findCigarBySlug(slug: string): Cigar | undefined {
  return MOCK_CIGARS.find((c) => c.slug === slug);
}

/**
 * Map a demo Lounge to the CatalogStore shape so lounge profiles and the claim
 * flow can treat demo lounges and the 713 imported stores identically.
 */
export function mockLoungeAsStore(slug: string) {
  const l = MOCK_LOUNGES.find((x) => x.slug === slug);
  if (!l) return undefined;
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    address: l.address,
    city: l.city,
    state: l.state,
    lat: l.lat,
    lng: l.lng,
    verified: l.verified,
    phone: l.phone ?? '',
    email: '',
    website: l.website ?? '',
    hours: l.hours ?? '',
    inventoryCount: l.inventoryCount,
  };
}

export function findFeaturedForEpisode(guid: string): { cigar: Cigar; nearby: Lounge[] } | null {
  const feat = MOCK_FEATURED.find((f) => f.episodeGuid === guid);
  if (!feat) {
    // Fall back to a deterministic cigar so every episode has a "featured" cigar in dev
    const idx = guid.charCodeAt(guid.length - 1) % MOCK_CIGARS.length;
    return { cigar: MOCK_CIGARS[idx], nearby: MOCK_LOUNGES.filter((l) => l.verified).slice(0, 3) };
  }
  const cigar = findCigarById(feat.cigarId);
  if (!cigar) return null;
  return { cigar, nearby: MOCK_LOUNGES.filter((l) => l.verified).slice(0, 3) };
}

// ─── LIVE VIEWERSHIP (what the TV sticks report back) ─────────────────────────
export interface LiveViewership {
  loungeId: string;
  loungeName: string;
  city: string;
  state: string;
  online: boolean; // is the device currently streaming
  concurrentViewers: number; // estimated headcount in the lounge
  watchHoursToday: number;
  creditsToday: number;
  deviceSerial: string;
}

/**
 * Mock telemetry for the live tracking page. In production this is computed from
 * the `viewership_events` table written by each lounge's TV stick, aggregated
 * per device per day. Online status comes from `tv_devices.last_seen`.
 */
export const MOCK_VIEWERSHIP: LiveViewership[] = [
  {
    loungeId: 'lng_001',
    loungeName: 'Corona Cigar Co.',
    city: 'Orlando',
    state: 'FL',
    online: true,
    concurrentViewers: 14,
    watchHoursToday: 9.2,
    creditsToday: 552,
    deviceSerial: 'CTV-0001',
  },
  {
    loungeId: 'lng_002',
    loungeName: 'West Tampa Tobacco Co.',
    city: 'Tampa',
    state: 'FL',
    online: true,
    concurrentViewers: 8,
    watchHoursToday: 6.7,
    creditsToday: 402,
    deviceSerial: 'CTV-0002',
  },
  {
    loungeId: 'lng_003',
    loungeName: 'King Corona Cigars',
    city: 'Tampa',
    state: 'FL',
    online: true,
    concurrentViewers: 11,
    watchHoursToday: 7.9,
    creditsToday: 474,
    deviceSerial: 'CTV-0003',
  },
  {
    loungeId: 'lng_004',
    loungeName: 'Tabanero Cigars',
    city: 'Tampa',
    state: 'FL',
    online: false,
    concurrentViewers: 0,
    watchHoursToday: 3.1,
    creditsToday: 186,
    deviceSerial: 'CTV-0004',
  },
];

// ─── LOUNGE OWNER DASHBOARD (private — scoped to the signed-in owner's lounge) ─
// In production this is gated by auth: a lounge_owner only ever sees the row(s)
// for lounges where lounges.owner_id = auth.uid(). RLS enforces it at the DB.
export const MOCK_OWNER_LOUNGE_ID = 'lng_001';

export interface CreditLedgerEntry {
  id: string;
  delta: number; // positive = earned, negative = spent
  reason: string;
  recordedAt: string;
}

export interface DashboardData {
  lounge: Lounge;
  device: { serial: string; online: boolean; lastSeen: string };
  viewersNow: number;
  watchHoursToday: number;
  creditsToday: number;
  creditBalance: number;
  // last 7 days of watch-hours, oldest first
  watchHours7d: { day: string; hours: number }[];
  ledger: CreditLedgerEntry[];
}

export function getOwnerDashboard(): DashboardData {
  const lounge = MOCK_LOUNGES.find((l) => l.id === MOCK_OWNER_LOUNGE_ID)!;
  const v = MOCK_VIEWERSHIP.find((x) => x.loungeId === MOCK_OWNER_LOUNGE_ID)!;
  return {
    lounge,
    device: { serial: v.deviceSerial, online: v.online, lastSeen: 'just now' },
    viewersNow: v.concurrentViewers,
    watchHoursToday: v.watchHoursToday,
    creditsToday: v.creditsToday,
    creditBalance: 4820,
    watchHours7d: [
      { day: 'Mon', hours: 7.1 },
      { day: 'Tue', hours: 6.4 },
      { day: 'Wed', hours: 8.2 },
      { day: 'Thu', hours: 7.8 },
      { day: 'Fri', hours: 10.6 },
      { day: 'Sat', hours: 11.9 },
      { day: 'Sun', hours: 9.2 },
    ],
    ledger: [
      { id: 'cl_1', delta: 552, reason: 'Viewership · today', recordedAt: 'Today' },
      { id: 'cl_2', delta: 714, reason: 'Viewership · Sat', recordedAt: 'Sat' },
      { id: 'cl_3', delta: -1200, reason: 'Boosted pin · Orlando 5mi', recordedAt: 'Fri' },
      { id: 'cl_4', delta: 636, reason: 'Viewership · Fri', recordedAt: 'Fri' },
      { id: 'cl_5', delta: 2000, reason: 'Padrón Month bonus multiplier', recordedAt: 'Thu' },
    ],
  };
}

// ─── TOP CIGARS IN THE US (ranked leaderboard, mock) ──────────────────────────
export type Trend = 'up' | 'down' | 'same' | 'new';

export interface RankedCigar {
  rank: number;
  trend: Trend;
  cigar: Cigar;
}

// Hand-tuned trend movement for the leaderboard. In production this is derived
// from week-over-week change in rating volume + average.
const TREND_BY_ID: Record<string, Trend> = {
  cig_padron_family_reserve_50: 'same',
  cig_fuente_opus_x: 'up',
  cig_padron_1964_exclusivo: 'down',
  cig_lfd_andalusian_bull: 'up',
  cig_ep_carrillo_pledge: 'new',
  cig_my_father_le_bijou: 'same',
  cig_ashton_vsg: 'up',
  cig_aging_room_quattro: 'new',
  cig_davidoff_late_hour: 'down',
  cig_drew_estate_liga_9: 'same',
  cig_tatuaje_brown_label: 'up',
  cig_perdomo_20th: 'down',
  cig_west_tampa_red: 'new',
  cig_rocky_patel_decade: 'same',
  cig_oliva_serie_v: 'down',
};

export function getTopCigars(limit = 15): RankedCigar[] {
  return [...MOCK_CIGARS]
    .sort((a, b) => b.overallAvg - a.overallAvg || b.ratingCount - a.ratingCount)
    .slice(0, limit)
    .map((cigar, i) => ({
      rank: i + 1,
      trend: TREND_BY_ID[cigar.id] ?? 'same',
      cigar,
    }));
}

// ─── COMMUNITY: LIKES + COMMENTS ON CIGARS ────────────────────────────────────
export interface CigarComment {
  id: string;
  author: string;
  handle: string;
  body: string;
  createdAt: string;
  likes: number;
}

export interface CigarSocial {
  likes: number;
  comments: CigarComment[];
}

// Seeded community activity per cigar. In production these come from `likes`
// and `comments` tables keyed on cigar_id, written by authenticated users.
const SOCIAL_BY_ID: Record<string, CigarSocial> = {
  cig_padron_1964_exclusivo: {
    likes: 312,
    comments: [
      { id: 'c1', author: 'Marco D.', handle: 'marco.ybor', body: 'Aged two of these 18 months. The cocoa really comes forward. Worth the wait.', createdAt: '2d ago', likes: 14 },
      { id: 'c2', author: 'Renee P.', handle: 'reneesmokes', body: 'My benchmark maduro. Burn is flawless every single time.', createdAt: '5d ago', likes: 9 },
      { id: 'c3', author: 'Sean', handle: 'sean.tampa', body: 'Pairs unreal with a cup of Cuban coffee. Tried it after the Padrón episode dropped.', createdAt: '1w ago', likes: 21 },
    ],
  },
  cig_fuente_opus_x: {
    likes: 489,
    comments: [
      { id: 'c4', author: 'Tomás G.', handle: 'tomasg', body: 'The unicorn. Finally found a box at Corona Cigar. Every bit as good as the hype.', createdAt: '1d ago', likes: 33 },
      { id: 'c5', author: 'Will H.', handle: 'willhavana', body: 'Spicy on the first third then settles into cedar and pepper. Top 3 all time for me.', createdAt: '4d ago', likes: 12 },
    ],
  },
};

export function getCigarSocial(cigarId: string): CigarSocial {
  return SOCIAL_BY_ID[cigarId] ?? { likes: 0, comments: [] };
}
