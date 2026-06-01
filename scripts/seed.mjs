#!/usr/bin/env node
/**
 * Seeds Supabase with the cigar catalog and lounge directory.
 *
 *   1. Run supabase/schema.sql in the SQL editor first (creates the tables).
 *   2. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Project Settings → API).
 *   3. node scripts/seed.mjs
 *
 * Idempotent: upserts on the primary key, so re-running is safe.
 * Requires network access to your Supabase project (run it on your machine,
 * not in a sandbox).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── env ──────────────────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* fall back to process.env */
  }
  return { ...env, ...process.env };
}
const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// ── tiny RFC4180 CSV parser (handles quoted commas) ───────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const num = (v) => (v === '' || v == null ? null : Number(v));
const nullable = (v) => (v && String(v).trim() ? String(v).trim() : null);

async function upsertAll(table, rows, size = 1000) {
  let done = 0;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`\n${table} batch @${i} failed:`, error.message);
      process.exit(1);
    }
    done += batch.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  process.stdout.write('\n');
}

// ── catalog_cigars ─────────────────────────────────────────────────────────────
async function seedCatalog() {
  const raw = parseCsv(readFileSync(join(root, 'supabase/seed/catalog_cigars.csv'), 'utf8'));
  const rows = raw.map((r) => ({
    id: r.id,
    brand: r.brand,
    name: r.name,
    country: nullable(r.country),
    price: num(r.price),
    size: nullable(r.size),
    slug: r.slug,
    image_url: nullable(r.image_url),
  }));
  console.log(`Seeding ${rows.length} cigars…`);
  await upsertAll('catalog_cigars', rows);
}

// ── lounges (from stores.csv) ────────────────────────────────────────────────
async function seedLounges() {
  const raw = parseCsv(readFileSync(join(root, 'supabase/seed/stores.csv'), 'utf8'));
  const withCoords = raw.filter((r) => r.lat?.trim() && r.lng?.trim());
  const skipped = raw.length - withCoords.length;
  const rows = withCoords.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    address: r.address || '—',
    city: r.city,
    state: r.state,
    lat: num(r.lat),
    lng: num(r.lng),
    verified: String(r.verified).toLowerCase() === 'true',
    phone: nullable(r.phone),
    email: nullable(r.email),
    website: nullable(r.website),
    hours: nullable(r.hours),
  }));
  console.log(`Seeding ${rows.length} lounges (${skipped} skipped — no coordinates yet)…`);
  await upsertAll('lounges', rows);
}

// ── bootstrap super admin (optional) ──────────────────────────────────────────
async function seedAdmin() {
  const uuid = 'cd2c8383-eb38-4b37-9fda-954b90e99b49';
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'super_admin' })
    .eq('id', uuid)
    .select('id');
  if (error) console.warn('Admin role update skipped:', error.message);
  else if (!data?.length) console.log('Admin profile not found yet — sign up first, then re-run with --admin.');
  else console.log('Super admin set for', uuid);
}

const args = process.argv.slice(2);
const run = async () => {
  if (args.includes('--admin')) return seedAdmin();
  await seedCatalog();
  await seedLounges();
  await seedAdmin();
  console.log('\nDone. Catalog + lounges are in Supabase.');
};
run().catch((e) => { console.error(e); process.exit(1); });
