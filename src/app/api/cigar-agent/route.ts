import { NextResponse } from 'next/server';
import { allCigars } from '@/lib/catalog';
import type { CatalogCigar } from '@/types';

/**
 * POST /api/cigar-agent  { query: string }
 *
 * The Cigar Concierge. Understands natural asks like "full-bodied Nicaraguan
 * with cocoa under $15" or "something like Padrón for a morning smoke":
 *  1. parses budget, countries, flavor words, vitola, strength, and brand
 *     references out of the query;
 *  2. retrieves + scores against the live 24k catalog (flavor_tags included);
 *  3. answers conversationally — via the Anthropic API when ANTHROPIC_API_KEY
 *     is configured, with a solid template fallback when it isn't.
 */

const FLAVOR_VOCAB = [
  'cocoa','chocolate','dark chocolate','coffee','espresso','pepper','black pepper','white pepper',
  'earth','leather','cedar','oak','wood','cream','nuts','almond','caramel','honey','grass','citrus',
  'floral','fruit','dried fruit','baking spice','sweet spice','spice','mineral','sweet tobacco',
];
const COUNTRIES = ['nicaragua','dominican','honduras','cuba','mexico','brazil','usa','connecticut'];
const VITOLAS = ['robusto','toro','churchill','corona','lancero','torpedo','figurado','gordo','lonsdale','petit','belicoso','perfecto'];

interface Parsed {
  maxPrice: number | null; minPrice: number | null;
  flavors: string[]; countries: string[]; vitolas: string[];
  brands: string[]; strength: 'mild' | 'full' | null;
}

function parse(q: string): Parsed {
  const lq = q.toLowerCase();
  const flavors = FLAVOR_VOCAB.filter((f) => lq.includes(f));
  const countries = COUNTRIES.filter((c) => lq.includes(c)).map((c) =>
    c === 'dominican' ? 'dominican republic' : c === 'connecticut' ? 'usa' : c);
  const vitolas = VITOLAS.filter((v) => lq.includes(v));

  let maxPrice: number | null = null, minPrice: number | null = null;
  const under = lq.match(/(?:under|below|less than|max|up to)\s*\$?\s*(\d+)/);
  const over = lq.match(/(?:over|above|at least|min)\s*\$?\s*(\d+)/);
  const range = lq.match(/\$?\s*(\d+)\s*(?:-|to)\s*\$?\s*(\d+)/);
  if (range) { minPrice = +range[1]; maxPrice = +range[2]; }
  else { if (under) maxPrice = +under[1]; if (over) minPrice = +over[1]; }

  const strength: Parsed['strength'] =
    /full[- ]bodied|strong|bold|powerful/.test(lq) ? 'full'
    : /mild|smooth|mellow|morning|breakfast|beginner|first cigar/.test(lq) ? 'mild' : null;

  // Brand references: match known brands appearing in the query.
  const brandSet = new Set<string>();
  const knownBrands = new Set(allCigars().map((c) => c.brand.toLowerCase()));
  for (const b of knownBrands) {
    if (b.length >= 4 && lq.includes(b)) brandSet.add(b);
  }
  // "like Padrón" partials
  const like = lq.match(/(?:like|similar to)\s+([a-z .'-]{3,30})/);
  if (like) {
    const frag = like[1].trim();
    for (const b of knownBrands) if (b.includes(frag) || frag.includes(b)) brandSet.add(b);
  }
  return { maxPrice, minPrice, flavors, countries, vitolas, brands: [...brandSet], strength };
}

function retrieve(p: Parsed, limit = 6): Array<CatalogCigar & { reasons: string[] }> {
  // Strength proxies when the catalog lacks explicit strength data.
  const fullCountries = new Set(['nicaragua', 'honduras']);
  const mildTags = new Set(['cream', 'grass', 'cedar', 'honey', 'almond', 'nuts']);
  const fullTags = new Set(['pepper', 'black pepper', 'espresso', 'earth', 'leather', 'dark chocolate']);

  const scored: Array<{ c: CatalogCigar; score: number; reasons: string[] }> = [];
  for (const c of allCigars()) {
    let score = 0; const reasons: string[] = [];
    const tags = (c.flavor_tags ?? []).map((t) => t.toLowerCase());
    const country = (c.country ?? '').toLowerCase();
    const brand = c.brand.toLowerCase();

    if (typeof c.price === 'number') {
      if (p.maxPrice != null && c.price > p.maxPrice) continue;
      if (p.minPrice != null && c.price < p.minPrice) continue;
      if (p.maxPrice != null) { score += 0.5; }
    } else if (p.maxPrice != null) continue;

    const fm = p.flavors.filter((f) => tags.includes(f));
    if (fm.length) { score += fm.length * 2.5; reasons.push(`${fm.join(' & ')} notes`); }
    if (p.countries.some((k) => country.includes(k))) { score += 2; reasons.push(`${c.country} tobacco`); }
    if (p.vitolas.some((v) => (c.size ?? '').toLowerCase().includes(v) || c.name.toLowerCase().includes(v))) {
      score += 1.5; reasons.push(`${c.size} format`);
    }
    if (p.brands.some((b) => brand.includes(b) || b.includes(brand))) { score += 3; reasons.push(`from ${c.brand}`); }
    if (p.strength === 'full') {
      const hits = tags.filter((t) => fullTags.has(t)).length + (fullCountries.has(country) ? 1 : 0);
      if (hits) { score += hits; reasons.push('full-bodied profile'); }
    }
    if (p.strength === 'mild') {
      const hits = tags.filter((t) => mildTags.has(t)).length;
      if (hits) { score += hits; reasons.push('smooth, mellow profile'); }
    }
    if (score > 0.5) scored.push({ c, score, reasons });
  }
  scored.sort((a, b) => b.score - a.score);

  const out: Array<CatalogCigar & { reasons: string[] }> = [];
  const perBrand = new Map<string, number>();
  for (const { c, reasons } of scored) {
    const k = c.brand.toLowerCase();
    if ((perBrand.get(k) ?? 0) >= 2) continue;
    out.push({ ...c, reasons });
    perBrand.set(k, (perBrand.get(k) ?? 0) + 1);
    if (out.length >= limit) break;
  }
  return out;
}

async function claudeReply(query: string, picks: Array<CatalogCigar & { reasons: string[] }>): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const list = picks.map((p) =>
      `- ${p.brand} ${p.name} (${p.country}, ${p.size}${p.price != null ? `, $${p.price}` : ''}) — matched: ${p.reasons.join(', ') || 'general fit'}`).join('\n');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'You are the MyHumidor Cigar Concierge — warm, knowledgeable, concise (2-3 sentences). Never invent cigars; only discuss the provided picks.',
        messages: [{ role: 'user', content: `Member asked: "${query}"\n\nCatalog picks:\n${list}\n\nWrite a short, friendly response introducing these picks.` }],
      }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const text = (d?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join(' ').trim();
    return text || null;
  } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const { query } = (await req.json()) as { query?: string };
    if (!query?.trim()) return NextResponse.json({ reply: 'Tell me what you\'re in the mood for.', picks: [] });

    const parsed = parse(query);
    const picks = retrieve(parsed);

    if (picks.length === 0) {
      return NextResponse.json({
        reply: "I couldn't find a clean match for that in the catalog. Try naming a flavor (cocoa, pepper, cream…), a country, a budget, or a brand you already enjoy.",
        picks: [],
      });
    }

    const ai = await claudeReply(query, picks);
    const reply = ai ?? buildTemplateReply(parsed, picks);
    return NextResponse.json({ reply, picks: picks.map((p) => ({
      slug: p.slug, brand: p.brand, name: p.name, country: p.country, size: p.size,
      price: p.price ?? null, image_url: p.image_url ?? null, reasons: p.reasons,
    })) });
  } catch {
    return NextResponse.json({ reply: 'Something went wrong — try that again.', picks: [] }, { status: 200 });
  }
}

function buildTemplateReply(p: Parsed, picks: Array<CatalogCigar & { reasons: string[] }>): string {
  const bits: string[] = [];
  if (p.flavors.length) bits.push(`${p.flavors.slice(0, 2).join(' and ')} notes`);
  if (p.strength) bits.push(p.strength === 'full' ? 'a fuller body' : 'a smoother, milder smoke');
  if (p.countries.length) bits.push(`${p.countries[0].replace(/\b\w/g, (m) => m.toUpperCase())} tobacco`);
  if (p.maxPrice != null) bits.push(`under $${p.maxPrice}`);
  const intro = bits.length ? `Looking for ${bits.join(', ')} — here's what stands out` : 'Here\'s what stands out from the catalog';
  return `${intro}: ${picks.slice(0, 3).map((x) => `${x.brand} ${x.name}`).join('; ')}. Tap any pick to see ratings and where it's in stock near you.`;
}
