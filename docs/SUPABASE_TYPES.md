# Generating Supabase types & removing `SbRow`

`SbRow` (`src/types/sb-row.d.ts`) is a deliberately loose row type we cast
Supabase query results onto, because the upgraded `supabase-js` no longer infers
`data` without a generated `Database` type. The proper fix is to generate that
type from the live database — which must be run by someone with project access
(it can't be done from the build sandbox).

## One-time generation

```bash
# 1. Authenticate the Supabase CLI (opens a browser, paste the token)
npx supabase login

# 2. Generate types for the public schema into the repo
npm run db:types
#   → writes src/types/database.types.ts
```

(If you prefer not to log in interactively, set `SUPABASE_ACCESS_TOKEN` in your
env and run `npm run db:types` directly.)

## Wiring the typed client (after database.types.ts exists)

In `src/lib/supabase.ts`, parameterise the factories:

```ts
import type { Database } from '@/types/database.types';
// createBrowserClient<Database>(...)  / createServerClient<Database>(...) / createClient<Database>(...)
```

With that in place, `data` is fully typed, the `SbRow` casts become unnecessary,
and `src/types/sb-row.d.ts` can be deleted. Re-run `npm run build` and fix the
handful of spots where our hand-written shapes differ from the generated ones.

Re-run `npm run db:types` whenever the schema changes (new migration).
