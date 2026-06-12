-- ════════════════════════════════════════════════════════════════════════════
-- Phase 28 — flavor_tags on the catalog + mainstream-brand seed.
-- Brand-level house profiles (line-level overrides applied last so they win).
-- Only fills rows that don't already have tags, so hand-curated data is safe.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.catalog_cigars add column if not exists flavor_tags text[] not null default '{}';
create index if not exists catalog_cigars_flavor_gin on public.catalog_cigars using gin (flavor_tags);

-- Brand-level seeds
update public.catalog_cigars set flavor_tags = array['cocoa','coffee','earth','pepper'] where flavor_tags = '{}' and lower(brand) like '%padron%';
update public.catalog_cigars set flavor_tags = array['cedar','cream','nuts','sweet spice'] where flavor_tags = '{}' and lower(brand) like '%arturo fuente%';
update public.catalog_cigars set flavor_tags = array['espresso','cocoa','pepper','oak'] where flavor_tags = '{}' and lower(brand) like '%drew estate%';
update public.catalog_cigars set flavor_tags = array['spice','cocoa','leather','coffee'] where flavor_tags = '{}' and lower(brand) like '%oliva%';
update public.catalog_cigars set flavor_tags = array['cedar','cream','wood'] where flavor_tags = '{}' and lower(brand) like '%romeo y julieta%';
update public.catalog_cigars set flavor_tags = array['pepper','cocoa','cedar','sweet tobacco'] where flavor_tags = '{}' and lower(brand) like '%my father%';
update public.catalog_cigars set flavor_tags = array['leather','coffee','wood'] where flavor_tags = '{}' and lower(brand) like '%rocky patel%';
update public.catalog_cigars set flavor_tags = array['cream','cedar','almond'] where flavor_tags = '{}' and lower(brand) like '%ashton%';
update public.catalog_cigars set flavor_tags = array['cream','white pepper','oak','grass'] where flavor_tags = '{}' and lower(brand) like '%davidoff%';
update public.catalog_cigars set flavor_tags = array['grass','honey','cedar'] where flavor_tags = '{}' and lower(brand) like '%cohiba%';
update public.catalog_cigars set flavor_tags = array['coffee','cream','wood'] where flavor_tags = '{}' and lower(brand) like '%montecristo%';
update public.catalog_cigars set flavor_tags = array['cedar','leather','coffee'] where flavor_tags = '{}' and lower(brand) like '%upmann%';
update public.catalog_cigars set flavor_tags = array['earth','leather','black pepper'] where flavor_tags = '{}' and lower(brand) like '%partagas%';
update public.catalog_cigars set flavor_tags = array['honey','wood','cream'] where flavor_tags = '{}' and lower(brand) like '%hoyo de monterrey%';
update public.catalog_cigars set flavor_tags = array['earth','cocoa','spice'] where flavor_tags = '{}' and lower(brand) like '%punch%';
update public.catalog_cigars set flavor_tags = array['cream','grass','cedar'] where flavor_tags = '{}' and lower(brand) like '%macanudo%';
update public.catalog_cigars set flavor_tags = array['chocolate','spice','wood'] where flavor_tags = '{}' and lower(brand) like '%cao%';
update public.catalog_cigars set flavor_tags = array['cocoa','coffee','caramel'] where flavor_tags = '{}' and lower(brand) like '%perdomo%';
update public.catalog_cigars set flavor_tags = array['wood','spice','sweet tobacco'] where flavor_tags = '{}' and lower(brand) like '%alec bradley%';
update public.catalog_cigars set flavor_tags = array['pepper','oak','dark chocolate'] where flavor_tags = '{}' and lower(brand) like '%la flor dominicana%';
update public.catalog_cigars set flavor_tags = array['pepper','earth','leather'] where flavor_tags = '{}' and lower(brand) like '%camacho%';
update public.catalog_cigars set flavor_tags = array['pepper','earth','chocolate'] where flavor_tags = '{}' and lower(brand) like '%joya de nicaragua%';
update public.catalog_cigars set flavor_tags = array['cocoa','dried fruit','earth'] where flavor_tags = '{}' and lower(brand) like '%plasencia%';
update public.catalog_cigars set flavor_tags = array['cocoa','wood','spice'] where flavor_tags = '{}' and lower(brand) like '%carrillo%';
update public.catalog_cigars set flavor_tags = array['earth','pepper','sweet tobacco'] where flavor_tags = '{}' and lower(brand) like '%foundation%';
update public.catalog_cigars set flavor_tags = array['leather','earth','espresso'] where flavor_tags = '{}' and lower(brand) like '%roma craft%';
update public.catalog_cigars set flavor_tags = array['cocoa','cedar','baking spice'] where flavor_tags = '{}' and lower(brand) like '%crowned heads%';
update public.catalog_cigars set flavor_tags = array['cream','cedar','floral'] where flavor_tags = '{}' and lower(brand) like '%warped%';
update public.catalog_cigars set flavor_tags = array['cocoa','nuts','mineral'] where flavor_tags = '{}' and lower(brand) like '%illusione%';
update public.catalog_cigars set flavor_tags = array['pepper','cedar','leather'] where flavor_tags = '{}' and lower(brand) like '%tatuaje%';
update public.catalog_cigars set flavor_tags = array['baking spice','oak','coffee'] where flavor_tags = '{}' and lower(brand) like '%aging room%';
update public.catalog_cigars set flavor_tags = array['earth','cocoa','pepper'] where flavor_tags = '{}' and lower(brand) like '%san cristobal%';
update public.catalog_cigars set flavor_tags = array['cream','cedar','white pepper'] where flavor_tags = '{}' and lower(brand) like '%aganorsa%';
update public.catalog_cigars set flavor_tags = array['pepper','fruit','earth'] where flavor_tags = '{}' and lower(brand) like '%southern draw%';
update public.catalog_cigars set flavor_tags = array['cocoa','spice','cream'] where flavor_tags = '{}' and lower(brand) like '%dunbarton%';
update public.catalog_cigars set flavor_tags = array['pepper','dark chocolate','earth'] where flavor_tags = '{}' and lower(brand) like '%black label trading%';
update public.catalog_cigars set flavor_tags = array['caramel','coffee','leather'] where flavor_tags = '{}' and lower(brand) like '%kristoff%';
update public.catalog_cigars set flavor_tags = array['earth','cocoa','wood'] where flavor_tags = '{}' and lower(brand) like '%saint luis rey%';
update public.catalog_cigars set flavor_tags = array['cream','citrus','cedar'] where flavor_tags = '{}' and lower(brand) like '%trinidad%';
update public.catalog_cigars set flavor_tags = array['earth','leather','pepper'] where flavor_tags = '{}' and lower(brand) like '%bolivar%';
update public.catalog_cigars set flavor_tags = array['spice','wood','sweet tobacco'] where flavor_tags = '{}' and lower(brand) like '%la gloria cubana%';
update public.catalog_cigars set flavor_tags = array['pepper','cocoa','cedar'] where flavor_tags = '{}' and lower(brand) like '%espinosa%';
update public.catalog_cigars set flavor_tags = array['pepper','cocoa','oak'] where flavor_tags = '{}' and lower(brand) like '%fernandez%';
update public.catalog_cigars set flavor_tags = array['pepper','leather','espresso'] where flavor_tags = '{}' and lower(brand) like '%diesel%';
update public.catalog_cigars set flavor_tags = array['cream','citrus','cedar'] where flavor_tags = '{}' and lower(brand) like '%caldwell%';
update public.catalog_cigars set flavor_tags = array['nuts','sweet tobacco','wood'] where flavor_tags = '{}' and lower(brand) like '%brick house%';
update public.catalog_cigars set flavor_tags = array['cocoa','earth','sweet spice'] where flavor_tags = '{}' and lower(brand) like '%la aroma de cuba%';
update public.catalog_cigars set flavor_tags = array['wood','spice','cream'] where flavor_tags = '{}' and lower(brand) like '%gurkha%';
update public.catalog_cigars set flavor_tags = array['cream','nuts','cedar'] where flavor_tags = '{}' and lower(brand) like '%avo%';
update public.catalog_cigars set flavor_tags = array['cream','cocoa','pepper'] where flavor_tags = '{}' and lower(brand) like '%la palina%';
update public.catalog_cigars set flavor_tags = array['cedar','cream','spice'] where flavor_tags = '{}' and lower(brand) like '%quesada%';
update public.catalog_cigars set flavor_tags = array['earth','spice','cocoa'] where flavor_tags = '{}' and lower(brand) like '%casa magna%';

-- Line-level overrides (always win)
update public.catalog_cigars set flavor_tags = array['espresso','dark chocolate','black pepper'] where lower(name) like '%liga privada%';
update public.catalog_cigars set flavor_tags = array['floral','citrus','spice','cedar'] where lower(name) like '%opusx%';
update public.catalog_cigars set flavor_tags = array['floral','citrus','spice','cedar'] where lower(name) like '%opus x%';
update public.catalog_cigars set flavor_tags = array['cocoa','espresso','sweet tobacco'] where lower(name) like '%undercrown%';
update public.catalog_cigars set flavor_tags = array['cedar','cream','pepper'] where lower(name) like '%herrera esteli%';
