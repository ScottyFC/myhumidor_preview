# Going fully live on Supabase

What's already real vs. what still runs on local storage, and the order to flip
each one over. Auth already runs on Supabase when the env vars are set.

## Already on Supabase
- **Auth / sessions** — `src/lib/auth.ts` (real when configured, demo otherwise).
- **Schema** — every table + RLS in `supabase/schema.sql`.

## Reference data — load once (see seed/LOAD_DATA.md)
- **Catalog** (`catalog_cigars`) and **Lounges** (`lounges`) via `node scripts/seed.mjs`.
  Reads currently come from `src/data/*.json` (fast, fine to keep). Switching
  `src/lib/catalog.ts` to query Supabase is optional and only needed if you want
  live edits to the catalog without a redeploy.

## User data — convert store-by-store (each is testable on its own)
Every file below is a thin localStorage module behind a clean function API, so
each converts to Supabase independently without touching the components that use
it. Recommended order:

| # | Store (`src/lib/…`)   | Table(s)                       | Notes |
|---|------------------------|--------------------------------|-------|
| 1 | `profile.ts`           | `profiles`                     | Avatar → Supabase Storage; rest are columns. |
| 2 | `collection.ts`        | `humidor_entries`              | status = humidor/wishlist. |
| 3 | `ratings.ts`           | `ratings`                      | Trigger maintains per-cigar averages. |
| 4 | `follows.ts`           | `follows`                      | Drives the home feed. |
| 5 | `submissions.ts`       | `cigar_submissions`            | Admin queue reads this. |
| 6 | `change-requests.ts`   | `change_requests` (add table)  | New table needed. |
| 7 | inventory + published  | `inventory_items`, `lounge_posts` | Publish writes the live menu. |
| 8 | `admin.ts`             | `profiles.role`                | Allowlist → role check via RLS. |

### Conversion pattern (same for every store)
These modules are synchronous today. The Supabase version is async, so each
converts like this:

```ts
// before (sync, local)
export function getCollection(): CollectionItem[] { /* localStorage */ }

// after (async, Supabase with a local fallback for demo mode)
export async function getCollection(): Promise<CollectionItem[]> {
  if (!isSupabaseConfigured) return readLocal();
  const { data } = await supabaseBrowser()
    .from('humidor_entries')
    .select('cigar_id, status, created_at, catalog_cigars(brand,name,size,slug)')
    .order('created_at', { ascending: false });
  return (data ?? []).map(toCollectionItem);
}
```

Consumers then `await` the call inside their existing `useEffect`/load and keep
their `onChange` subscriptions (swap the `storage` event for a Supabase Realtime
channel on the same table if you want live updates across devices).

Because each store is isolated, you can flip one, test it against your live
project, and move to the next — the rest keep working on localStorage until you
get to them.
EOF
echo "migration roadmap written"