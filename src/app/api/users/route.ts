import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

/**
 * GET /api/users?q=scott&limit=5
 * Autocomplete for member profiles — matches handle or display name.
 * Returns [] when Supabase isn't configured.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5', 10) || 5, 10);
  if (q.length < 2 || !isSupabaseConfigured) return NextResponse.json({ items: [] });

  try {
    const sb = await supabaseServer();
    const like = `%${q}%`;
    const { data, error } = await sb
      .from('profiles')
      .select('handle, display_name, city, state, avatar_url, aficionado')
      .or(`handle.ilike.${like},display_name.ilike.${like}`)
      .limit(limit);
    if (error) return NextResponse.json({ items: [] });
    const items = (data ?? []).map((p: Record<string, unknown>) => ({
      handle: p.handle,
      displayName: p.display_name,
      city: p.city ?? null,
      state: p.state ?? null,
      avatarUrl: p.avatar_url ?? null,
      aficionado: !!p.aficionado,
    }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
