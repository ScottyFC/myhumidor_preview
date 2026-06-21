import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer, supabaseService } from '@/lib/supabase';
import { findCatalogCigarBySlug, findCatalogCigar } from '@/lib/catalog';

export const runtime = 'nodejs';

async function generateDescription(c: { brand: string; name: string; country?: string; size?: string; flavor_tags?: string[] }): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const ctx = [
      `${c.brand} ${c.name}`,
      c.country ? `from ${c.country}` : '',
      c.size ? `(${c.size})` : '',
      c.flavor_tags?.length ? `flavor notes: ${c.flavor_tags.join(', ')}` : '',
    ].filter(Boolean).join(' · ');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 220,
        system: 'You are a cigar writer for MyHumidor. Write a vivid, factual 2–3 sentence tasting description. No rating numbers, no markdown, no hype clichés like "second to none". If details are sparse, keep it general but evocative.',
        messages: [{ role: 'user', content: `Write a tasting description for this cigar: ${ctx}` }],
      }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const text = (d?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join(' ').trim();
    return text || null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  const cigar = findCatalogCigarBySlug(slug);
  if (!cigar) return NextResponse.json({ description: null, recScore: null });

  // ── Description (cached) ──────────────────────────────────────────────
  let description: string | null = null;
  if (isSupabaseConfigured) {
    const svc = supabaseService();
    try {
      const sb = await supabaseServer();
      const { data } = await sb.from('cigar_descriptions').select('description').eq('slug', slug).maybeSingle();
      description = data?.description ?? null;
      if (!description) {
        description = await generateDescription(cigar);
        if (description && svc) await svc.from('cigar_descriptions').upsert({ slug, description });
      }
    } catch { /* ignore */ }
  } else {
    description = await generateDescription(cigar);
  }

  // ── Personalized recommendation score ────────────────────────────────
  let recScore: { score: number; reasons: string[] } | null = null;
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data: auth } = await sb.auth.getUser();
      const uid = auth?.user?.id;
      if (uid) {
        const { data: ratings } = await sb.from('ratings').select('cigar_id, overall').eq('user_id', uid);
        const rows = (ratings ?? []) as Array<{ cigar_id: string; overall: number }>;
        if (rows.length >= 2) {
          // Build a weighted taste profile from rated cigars' flavor tags + countries.
          const flavorW = new Map<string, number>();
          const countryW = new Map<string, number>();
          for (const r of rows) {
            const rc = findCatalogCigar(r.cigar_id);
            if (!rc) continue;
            const w = (Number(r.overall) || 3) - 2.5; // >0 liked, <0 disliked
            for (const t of rc.flavor_tags ?? []) flavorW.set(t.toLowerCase(), (flavorW.get(t.toLowerCase()) ?? 0) + w);
            if (rc.country) countryW.set(rc.country, (countryW.get(rc.country) ?? 0) + w);
          }
          const tags = (cigar.flavor_tags ?? []).map((t) => t.toLowerCase());
          const matched = tags.filter((t) => (flavorW.get(t) ?? 0) > 0);
          const flavorScore = matched.reduce((a, t) => a + (flavorW.get(t) ?? 0), 0);
          const maxFlavor = Math.max(1, [...flavorW.values()].filter((v) => v > 0).reduce((a, b) => a + b, 0));
          const countryBonus = cigar.country && (countryW.get(cigar.country) ?? 0) > 0 ? 12 : 0;
          const raw = Math.min(100, Math.round((flavorScore / maxFlavor) * 80) + countryBonus + (matched.length ? 8 : 0));
          const score = Math.max(matched.length ? 40 : 15, raw); // floor so it never reads as "0%"
          const reasons: string[] = [];
          if (matched.length) reasons.push(`matches your taste for ${matched.slice(0, 3).join(', ')}`);
          if (countryBonus) reasons.push(`you tend to enjoy ${cigar.country} cigars`);
          recScore = { score, reasons };
        }
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({ description, recScore });
}
