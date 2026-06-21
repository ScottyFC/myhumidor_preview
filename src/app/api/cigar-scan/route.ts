import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';
import { searchCigars } from '@/lib/catalog';

export const runtime = 'nodejs';

/**
 * POST { image: dataURL } — reads a cigar band with a vision model and returns
 * the most likely catalog matches. Aficionado-only (enforced here for cost
 * control). Beta: confidence varies with band legibility.
 */
export async function POST(req: Request) {
  // Gate to Aficionado members.
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data: auth } = await sb.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return NextResponse.json({ error: 'auth' }, { status: 401 });
      const { data: prof } = await sb.from('profiles').select('aficionado').eq('id', uid).maybeSingle();
      if (!prof?.aficionado) return NextResponse.json({ error: 'aficionado_only' }, { status: 403 });
    } catch {
      return NextResponse.json({ error: 'auth' }, { status: 401 });
    }
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'not_configured' }, { status: 200 });

  const { image } = await req.json().catch(() => ({ image: '' }));
  const m = typeof image === 'string' ? image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/) : null;
  if (!m) return NextResponse.json({ error: 'bad_image' }, { status: 200 });
  const mediaType = m[1];
  const data = m[2];

  // Read the band.
  let brand = '', line = '', confidence = 'low';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: 'You identify cigars from a photo of the band/label. Respond ONLY with strict JSON: {"brand": string, "line": string, "confidence": "high"|"medium"|"low"}. brand is the maker (e.g. "Padron", "CAO"); line is the specific series/blend if legible (e.g. "1964 Anniversary", "Brazilia"), else "". If you cannot read a cigar band, return empty strings and "low".',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            { type: 'text', text: 'What cigar is this? Read the band.' },
          ],
        }],
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const text = (d?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('').trim();
      const j = JSON.parse(text.replace(/```json|```/g, '').trim());
      brand = (j.brand ?? '').toString().trim();
      line = (j.line ?? '').toString().trim();
      confidence = (j.confidence ?? 'low').toString();
    }
  } catch { /* fall through with empties */ }

  if (!brand && !line) return NextResponse.json({ read: { brand, line, confidence }, candidates: [] });

  // Match against the catalog: brand first, then rank by overlap with the line.
  const byBrand = searchCigars(brand || line, 60).items;
  const lineTokens = line.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const ranked = byBrand
    .map((c) => {
      const name = c.name.toLowerCase();
      const score = lineTokens.reduce((a, t) => a + (name.includes(t) ? 1 : 0), 0);
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ c }) => ({ slug: c.slug, brand: c.brand, name: c.name, image_url: c.image_url ?? null }));

  return NextResponse.json({ read: { brand, line, confidence }, candidates: ranked });
}
