import { NextResponse } from 'next/server';
import { searchCigars } from '@/lib/catalog';
import { applyOverrides } from '@/lib/overrides';

/**
 * GET /api/cigars?q=padron&limit=25&offset=0
 * Searches the full cigar catalog by brand or name, applying admin overrides
 * (removed cigars are dropped; edited fields are merged).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25', 10) || 25, 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;
  const result = searchCigars(q, limit, offset);
  const items = await applyOverrides(result.items);
  return NextResponse.json({ ...result, items });
}
