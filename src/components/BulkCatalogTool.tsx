'use client';

import { useState } from 'react';
import { Download, Upload, Loader2, Check, AlertTriangle, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase';
import type { Json } from '@/types/database.types';
import { cn } from '@/lib/utils';

const HEADERS = ['slug', 'brand', 'name', 'country', 'price', 'image_url', 'buy_url', 'removed'];
const EDITABLE = ['brand', 'name', 'country', 'price', 'image_url', 'buy_url', 'removed'];

const EXAMPLE = [
  HEADERS.join(','),
  'padron-1964-anniversary-exclusivo,Padrón,1964 Anniversary Exclusivo,Nicaragua,17.50,https://cdn.example.com/padron.png,https://padron.com/buy,false',
  'my-old-cigar-slug,,,,,,,true',
].join('\n');

interface PreviewRow {
  raw: Record<string, string>;
  payload: Record<string, unknown>;
  issues: string[];     // blocking
  warnings: string[];   // non-blocking
}

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

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);
const isBool = (s: string) => /^(true|false|1|0|yes|no|y|n)$/i.test(s);

function validate(rows: Record<string, string>[]): { preview: PreviewRow[]; unknownCols: string[] } {
  const seen = new Set<string>();
  const cols = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => cols.add(k)));
  const unknownCols = [...cols].filter((c) => c && !HEADERS.includes(c));

  const preview = rows.map((raw) => {
    const issues: string[] = [], warnings: string[] = [];
    const slug = raw.slug ?? '';
    if (!slug) issues.push('Missing slug — row will be skipped.');
    else if (seen.has(slug)) warnings.push('Duplicate slug in file (last one wins).');
    seen.add(slug);

    if (raw.price && isNaN(Number(raw.price))) warnings.push('Price is not a number — will be ignored.');
    if (raw.image_url && !isUrl(raw.image_url)) warnings.push('image_url doesn’t look like a URL.');
    if (raw.buy_url && !isUrl(raw.buy_url)) warnings.push('buy_url doesn’t look like a URL.');
    if (raw.removed && !isBool(raw.removed)) warnings.push('removed should be true/false.');

    const hasEdit = EDITABLE.some((k) => (raw[k] ?? '') !== '');
    if (slug && !hasEdit) warnings.push('No fields to change in this row.');

    const payload: Record<string, unknown> = { slug };
    for (const k of EDITABLE) if ((raw[k] ?? '') !== '') payload[k] = k === 'removed' ? /^(true|1|yes|y)$/i.test(raw[k]) : raw[k];

    return { raw, payload, issues, warnings };
  });
  return { preview, unknownCols };
}

export function BulkCatalogTool() {
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [unknownCols, setUnknownCols] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState('');

  function downloadExample() {
    const blob = new Blob([EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'myhumidor-catalog-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setResult(null); setPreview(null);
    try {
      const rows = parseCsv(await f.text());
      if (rows.length === 0) throw new Error('No data rows found (need a header row + at least one row).');
      const { preview, unknownCols } = validate(rows);
      setUnknownCols(unknownCols);
      setPreview(preview);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not read CSV.');
    }
  }

  async function apply() {
    if (!preview) return;
    const valid = preview.filter((p) => p.issues.length === 0).map((p) => p.payload);
    if (valid.length === 0) { setErr('Nothing to apply — every row has a blocking issue.'); return; }
    setBusy(true); setErr(''); setResult(null);
    try {
      let total = 0;
      for (let i = 0; i < valid.length; i += 500) {
        const chunk = valid.slice(i, i + 500);
        const { data, error } = await supabaseBrowser().rpc('bulk_set_catalog_override', { p_rows: chunk as unknown as Json });
        if (error) throw new Error(error.message);
        total += typeof data === 'number' ? data : chunk.length;
      }
      setResult(`Applied ${total} row${total === 1 ? '' : 's'}. Changes appear within ~30s.`);
      setPreview(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Apply failed.');
    } finally {
      setBusy(false);
    }
  }

  const okCount = preview?.filter((p) => p.issues.length === 0).length ?? 0;
  const warnCount = preview?.filter((p) => p.issues.length === 0 && p.warnings.length > 0).length ?? 0;
  const badCount = preview?.filter((p) => p.issues.length > 0).length ?? 0;

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-smoke-300">
        Bulk-update catalog cigars by CSV — brand, name, origin, image URL, purchase link, or removal.
        Match each cigar by its <span className="text-ember-100">slug</span> (the last part of its URL).
        Blank cells are left unchanged. Upload to preview &amp; validate before anything is applied.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={downloadExample} className="btn-ghost text-xs">
          <Download size={14} strokeWidth={1.5} /> Download CSV template
        </button>
        <label className="btn-ghost cursor-pointer text-xs">
          <Upload size={14} strokeWidth={1.5} /> Choose CSV to preview
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </label>
      </div>

      {result && <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ember-100"><Check size={14} strokeWidth={2} /> {result}</p>}
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

      {preview && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-ember-100"><Check size={12} strokeWidth={2} /> {okCount} ready</span>
            {warnCount > 0 && <span className="inline-flex items-center gap-1 text-amber-300"><AlertTriangle size={12} /> {warnCount} with warnings</span>}
            {badCount > 0 && <span className="inline-flex items-center gap-1 text-red-400"><X size={12} /> {badCount} skipped</span>}
          </div>
          {unknownCols.length > 0 && (
            <p className="mb-2 text-xs text-amber-300">Unrecognized columns ignored: {unknownCols.join(', ')}</p>
          )}

          <div className="max-h-80 overflow-auto rounded-lg border-[0.5px] border-ember-400/15">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-char text-smoke-400">
                <tr>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5">slug</th>
                  <th className="px-2 py-1.5">changes</th>
                  <th className="px-2 py-1.5">notes</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => {
                  const bad = p.issues.length > 0;
                  const warn = !bad && p.warnings.length > 0;
                  const changes = Object.keys(p.payload).filter((k) => k !== 'slug');
                  return (
                    <tr key={i} className="border-t-[0.5px] border-ember-400/10 align-top">
                      <td className="px-2 py-1.5">
                        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                          bad ? 'bg-red-500/15 text-red-300' : warn ? 'bg-amber-500/15 text-amber-300' : 'bg-ember-400/15 text-ember-100')}>
                          {bad ? <X size={10} /> : warn ? <AlertTriangle size={10} /> : <Check size={10} />}
                          {bad ? 'Skip' : warn ? 'Check' : 'OK'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[11px] text-paper">{p.raw.slug || <span className="text-red-400">—</span>}</td>
                      <td className="px-2 py-1.5 text-smoke-300">{changes.length ? changes.join(', ') : <span className="text-smoke-500">none</span>}</td>
                      <td className="px-2 py-1.5 text-smoke-400">{[...p.issues, ...p.warnings].join(' ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button onClick={apply} disabled={busy || okCount === 0} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-medium text-paper hover:bg-ember-600 disabled:opacity-50">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2} />}
              Apply {okCount} row{okCount === 1 ? '' : 's'}
            </button>
            <button onClick={() => setPreview(null)} className="text-xs text-smoke-400 hover:text-paper">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-3 text-xs text-smoke-400">
        Columns: <span className="text-smoke-200">{HEADERS.join(', ')}</span>. Only <span className="text-smoke-200">slug</span> is
        required. Tip: open a brand page as admin and use <span className="text-smoke-200">Download brand CSV</span> to get a ready-to-edit file.
      </div>
    </div>
  );
}
