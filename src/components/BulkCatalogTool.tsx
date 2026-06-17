'use client';

import { useState } from 'react';
import { Download, Upload, Loader2, Check } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase';

const HEADERS = ['slug', 'brand', 'name', 'country', 'price', 'image_url', 'buy_url', 'removed'];

const EXAMPLE = [
  HEADERS.join(','),
  'padron-1964-anniversary-exclusivo,Padrón,1964 Anniversary Exclusivo,Nicaragua,17.50,https://cdn.example.com/padron.png,https://padron.com/buy,false',
  'my-old-cigar-slug,,,,,,,true',
].join('\n');

/** Minimal CSV parser (handles quoted fields + escaped quotes). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
    } else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')).map((r) => {
    const o: Record<string, string> = {};
    head.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

/** Admin: bulk-update catalog cigars (brand/name/origin/image/buy link/removed) via CSV. */
export function BulkCatalogTool() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState('');

  function downloadExample() {
    const blob = new Blob([EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'myhumidor-catalog-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setErr(''); setResult(null);
    try {
      const rows = parseCsv(await f.text());
      const cleaned = rows
        .filter((r) => (r.slug ?? '').length > 0)
        .map((r) => ({
          slug: r.slug,
          brand: r.brand || undefined,
          name: r.name || undefined,
          country: r.country || undefined,
          price: r.price || undefined,
          image_url: r.image_url || undefined,
          buy_url: r.buy_url || undefined,
          removed: r.removed ? /^(true|1|yes|y)$/i.test(r.removed) : undefined,
        }));
      if (cleaned.length === 0) throw new Error('No rows with a "slug" column found.');
      // Chunk to keep each RPC payload reasonable.
      let total = 0;
      for (let i = 0; i < cleaned.length; i += 500) {
        const chunk = cleaned.slice(i, i + 500);
        const { data, error } = await supabaseBrowser().rpc('bulk_set_catalog_override', { p_rows: chunk });
        if (error) throw new Error(error.message);
        total += typeof data === 'number' ? data : chunk.length;
      }
      setResult(`Updated ${total} cigar${total === 1 ? '' : 's'}. Changes appear within ~30s.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-smoke-300">
        Bulk-update catalog cigars by CSV — brand, name, origin, image URL, purchase link, or removal.
        Match each cigar by its <span className="text-ember-100">slug</span> (the last part of its
        URL, e.g. <span className="text-ember-100">/cigars/<u>padron-1964-…</u></span>). Blank cells are
        left unchanged. Set <span className="text-ember-100">removed</span> to <span className="text-ember-100">true</span> to hide a cigar from the site.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={downloadExample} className="btn-ghost text-xs">
          <Download size={14} strokeWidth={1.5} /> Download CSV template
        </button>
        <label className="btn-ghost cursor-pointer text-xs">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} strokeWidth={1.5} />}
          Upload CSV
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} className="hidden" />
        </label>
      </div>

      {result && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ember-100">
          <Check size={14} strokeWidth={2} /> {result}
        </p>
      )}
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

      <div className="mt-5 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-3 text-xs text-smoke-400">
        Columns: <span className="text-smoke-200">{HEADERS.join(', ')}</span>. Only <span className="text-smoke-200">slug</span> is
        required. For images this is the fastest path — export your cigars, fill the
        <span className="text-smoke-200"> image_url</span> column, and re-upload.
      </div>
    </div>
  );
}
