// Shape-loose row type for Supabase query results that we map into our own
// typed shapes. Values are permissive on purpose — the surrounding code casts
// each field into the concrete domain type.
/* eslint-disable @typescript-eslint/no-explicit-any */
type SbRow = Record<string, any>;
