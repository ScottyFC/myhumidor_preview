import { NextResponse } from 'next/server';
import { getBrandSession, validateCsrf } from '@/lib/brand-auth';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MAX = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = supabaseService() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'Storage unavailable.' }, { status: 503 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, error: 'Bad upload.' }, { status: 400 }); }
  const file = form.get('file');
  const k = String(form.get('kind') || 'logo'); const kind = k === 'banner' ? 'banner' : k === 'logo' ? 'logo' : k;  // logo/banner persist to brand; others (cigar, badge) are upload-only
  if (!(file instanceof Blob)) return NextResponse.json({ ok: false, error: 'No file.' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: 'File too large (max 8MB).' }, { status: 400 });
  const type = file.type || 'image/jpeg';
  if (!type.startsWith('image/')) return NextResponse.json({ ok: false, error: 'Images only.' }, { status: 400 });

  const ext = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `brands/${s.brandId}/${kind}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from('submissions').upload(path, buf, { contentType: type, upsert: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const url = sb.storage.from('submissions').getPublicUrl(path).data.publicUrl;

  // Logo/banner persist straight onto the brand; cigar images are returned for the
  // add-cigar call to store on the catalog row.
  if (kind === 'logo' || kind === 'banner') {
    await sb.from('brands').update({ [kind === 'logo' ? 'logo_url' : 'banner_url']: url } as never).eq('id', s.brandId);
  }
  return NextResponse.json({ ok: true, url });
}
