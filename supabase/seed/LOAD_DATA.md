# Loading the datasets into Supabase

The app ships with the full datasets as JSON in `src/data/` so it runs locally
with zero setup. When you move to Supabase, import the cleaned CSVs in this
folder instead.

## Files

- `catalog_cigars.csv` — 23,567 cigars: `id, brand, name, country, price, size, slug`
- `stores.csv` — 713 stores: `id, slug, name, address, city, state, lat, lng, verified, phone, email, website, hours`

Both are cleaned from your original uploads: prices parsed to numbers, slugs
generated, columns aligned to the schema.

## Step 1 — Create the tables

Run `supabase/schema.sql` first (SQL Editor → New query → paste → run). It
creates `catalog_cigars` and `lounges` (among others).

## Step 2 — Import the CSVs

**Option A — Table Editor (easiest)**
1. Supabase dashboard → Table Editor → `catalog_cigars` → Insert → Import data from CSV.
2. Upload `catalog_cigars.csv`. Map columns (they already match). Import.
3. Repeat for `lounges` using `stores.csv`.

**Option B — psql `\copy` (fastest for 23k rows)**
```bash
psql "$SUPABASE_DB_URL" \
  -c "\copy public.catalog_cigars(id,brand,name,country,price,size,slug) \
      FROM 'supabase/seed/catalog_cigars.csv' WITH (FORMAT csv, HEADER true)"

psql "$SUPABASE_DB_URL" \
  -c "\copy public.lounges(id,slug,name,address,city,state,lat,lng,verified,phone,email,website,hours) \
      FROM 'supabase/seed/stores.csv' WITH (FORMAT csv, HEADER true)"
```

## Step 3 — Point the app at Supabase

Swap the reads in `src/lib/catalog.ts` (currently reading the JSON files) for
Supabase queries:

```ts
// search cigars
const { data, count } = await supabase
  .from('catalog_cigars')
  .select('*', { count: 'exact' })
  .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
  .range(offset, offset + limit - 1);
```

The `/api/cigars` and `/api/stores` routes and the inventory UI keep working
unchanged — only the data source behind them moves.

## Note on store coordinates

The store dataset has no lat/lng. Until you geocode them (Mapbox Geocoding API
or Google), the `/map` page plots only the demo lounges that have coordinates.
A one-time batch geocode of the 713 addresses backfills `lounges.lat/lng`.
