-- ════════════════════════════════════════════════════════════════════════════
-- Phase 105 — Badge system overhaul.
--
-- The original badge catalog was a proof-of-concept. Now that the live catalog
-- holds ~13k cigars and ~900 lounges, this replaces the global achievement
-- badges with a set grounded in the real data: the countries, brands, price
-- bands, vitolas and tasting notes that actually occur, plus lounge check-in
-- milestones (distinct lounges, states visited, certified stops, retail shops).
--
--  1) Every earned badge is reset — all users (and all future users) start at
--     zero. Lounge/brand collectible badges are preserved (they are owner-
--     created content); users simply re-collect them on their next check-in.
--  2) The POC global achievement catalog (badges with no lounge/brand owner)
--     is removed and replaced by the catalog below.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Reset all earned badges.
delete from public.user_badges;

-- 2) Remove the POC global achievement catalog (keep owner-created collectibles).
delete from public.badges where lounge_id is null and brand_id is null;

-- 3) Insert the new, data-grounded catalog. Criteria strings are the same
--    human-readable format the app parses to auto-award.
insert into public.badges (slug, name, criteria, tier, aficionado_only, status) values
  -- ── Getting started / volume ──────────────────────────────────────────────
  ('first-light',      'First Light',       'Rate your first cigar',              'bronze', false, 'active'),
  ('reviews-10',       'Getting Started',   'Log 10 cigar reviews',               'bronze', false, 'active'),
  ('reviews-25',       'Regular Rotation',  'Log 25 cigar reviews',               'silver', false, 'active'),
  ('reviews-50',       'Seasoned Palate',   'Log 50 cigar reviews',               'gold',   false, 'active'),
  ('reviews-100',      'Century Club',      'Log 100 cigar reviews',              'rare',   false, 'active'),
  ('humidor-10',       'Well Stocked',      'Keep 10 cigars in your humidor',     'bronze', false, 'active'),
  ('humidor-25',       'The Collector',     'Keep 25 cigars in your humidor',     'silver', false, 'active'),
  ('humidor-50',       'The Curator',       'Keep 50 cigars in your humidor',     'gold',   false, 'active'),

  -- ── Origin / tobacco country ──────────────────────────────────────────────
  ('origin-nicaragua', 'Nicaraguan Roots',  'Rate 5 cigars with Nicaraguan tobacco', 'bronze', false, 'active'),
  ('origin-dominican', 'Dominican Days',    'Rate 5 cigars with Dominican tobacco',  'bronze', false, 'active'),
  ('origin-honduras',  'Honduran Heat',     'Rate 3 cigars with Honduran tobacco',   'silver', false, 'active'),
  ('origin-mexico',    'San Andres Seeker', 'Rate a cigar with Mexican tobacco',     'silver', false, 'active'),
  ('origin-usa',       'Homegrown',         'Rate a cigar with American tobacco',    'silver', false, 'active'),
  ('origin-cuba',      'Cuban Mystique',    'Rate your first authentic Cuban cigar', 'gold',   false, 'active'),
  ('world-tour-5',     'World Tour',        'Rate cigars from 5 different countries', 'gold',  false, 'active'),
  ('world-tour-8',     'Globetrotter',      'Rate cigars from 8 different countries', 'rare',  false, 'active'),

  -- ── Brand loyalty (top brands in the catalog) ─────────────────────────────
  ('brand-fuente',     'Fuente Faithful',   'Rate 3 different Arturo Fuente cigars',  'silver', false, 'active'),
  ('brand-padron',     'Padron Pursuit',    'Rate 3 different Padron cigars',         'gold',   false, 'active'),
  ('brand-montecristo','Montecristo Member','Rate 3 different Montecristo cigars',    'silver', false, 'active'),
  ('brand-rocky-patel','Rocky Patel Regular','Rate 3 different Rocky Patel cigars',   'silver', false, 'active'),
  ('brand-oliva',      'Oliva Devotee',     'Rate 3 different Oliva cigars',          'silver', false, 'active'),
  ('brand-romeo',      'Romeo Romantic',    'Rate 3 different Romeo y Julieta cigars','silver', false, 'active'),

  -- ── Price bands (catalog median ~$8.50) ───────────────────────────────────
  ('value-hunter',     'Value Hunter',      'Rate 5 cigars that cost under $8',   'bronze', false, 'active'),
  ('premium-palate',   'Premium Palate',    'Rate a cigar that costs over $15',   'silver', false, 'active'),
  ('top-shelf',        'Top Shelf',         'Rate a cigar that costs over $30',   'gold',   false, 'active'),

  -- ── Vitolas ───────────────────────────────────────────────────────────────
  ('vitola-toro',      'Toro Territory',    'Rate 5 toro vitolas',                'bronze', false, 'active'),
  ('vitola-robusto',   'Robusto Regular',   'Rate 5 robusto vitolas',             'bronze', false, 'active'),
  ('vitola-churchill', 'Churchill Class',   'Rate 3 churchill vitolas',           'silver', false, 'active'),
  ('vitola-figurado',  'Figurado Fancier',  'Rate 3 figurado vitolas',            'silver', false, 'active'),
  ('vitola-variety',   'Shape Shifter',     'Rate 5 different vitolas',           'gold',   false, 'active'),

  -- ── Palate / tasting notes ────────────────────────────────────────────────
  ('note-cocoa',       'Cocoa Connoisseur', 'Note ''cocoa'' in 3 reviews',        'bronze', false, 'active'),
  ('note-pepper',      'Pepper Head',       'Note ''pepper'' in 3 reviews',       'bronze', false, 'active'),
  ('note-coffee',      'Coffee Notes',      'Note ''coffee'' in 3 reviews',       'silver', false, 'active'),
  ('note-cedar',       'Cedar Sense',       'Note ''cedar'' in 3 reviews',        'silver', false, 'active'),
  ('note-leather',     'Old Leather',       'Note ''leather'' in 3 reviews',      'silver', false, 'active'),
  ('note-cream',       'Smooth & Creamy',   'Note ''cream'' in 3 reviews',        'silver', false, 'active'),

  -- ── Reviewer quality ──────────────────────────────────────────────────────
  ('flawless',         'Flawless',          'Give a cigar a flawless 5/5',        'gold',   false, 'active'),
  ('honest-critic',    'Honest Critic',     'Give 5 cigars honest feedback under 2 stars', 'silver', false, 'active'),

  -- ── Lounges & shops ───────────────────────────────────────────────────────
  ('lounge-first',     'First Round',       'Check in at your first lounge',      'bronze', false, 'active'),
  ('lounge-5',         'Lounge Regular',    'Check in at 5 different lounges',    'silver', false, 'active'),
  ('lounge-15',        'Lounge Legend',     'Check in at 15 different lounges',   'gold',   false, 'active'),
  ('lounge-states-3',  'Road Tripper',      'Visit lounges in 3 different states', 'silver', false, 'active'),
  ('lounge-states-7',  'Cross Country',     'Visit lounges in 7 different states', 'rare',  false, 'active'),
  ('lounge-certified', 'Certified Stop',    'Check in at a certified lounge',     'silver', false, 'active'),
  ('lounge-retail',    'Shop Talk',         'Check in at a cigar shop',           'bronze', false, 'active')
on conflict (slug) do update
  set name = excluded.name, criteria = excluded.criteria, tier = excluded.tier,
      aficionado_only = excluded.aficionado_only, status = excluded.status,
      lounge_id = null, brand_id = null;
