import { NextResponse } from 'next/server';
import { searchStores } from '@/lib/catalog';

/**
 * GET /api/stores?q=tampa&limit=25&offset=0
 * Searches the full store directory (713 records) by name, city, or state.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25', 10) || 25, 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;
  const result = searchStores(q, limit, offset);
  return NextResponse.json(result);
}
