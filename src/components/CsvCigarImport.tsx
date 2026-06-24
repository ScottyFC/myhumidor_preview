'use client';
import { useState } from 'react';
import { Loader2, Upload, FileSpreadsheet, Download, X } from 'lucide-react';
import { bulkAddCigars, type BulkCigarRow } from '@/lib/brands';

const COLS = ['name', 'size', 'country', 'price', 'status', 'image_url'];

/** Minimal CSV parser: handles quoted fields, commas and newlines inside quotes, and "" escapes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function toRows(text: string): { rows: BulkCigarRow[]; error: string | null } {
  const grid = parseCsv(text);
  if (grid.length < 2) return { rows: [], error: 'Need a header row plus at least one cigar.' };
  const header = grid[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = idx(['name', 'cigar', 'cigar_name']);
  if (iName < 0) return { rows: [], error: 'Missing a "name" column.' };
  const iSize = idx(['size', 'vitola']); const iCountry = idx(['country', 'origin']);
  const iPrice = idx(['price', 'msrp']); const iStatus = idx(['status']); const iImg = idx(['image_url', 'imageurl', 'image', 'photo']);
  const rows: BulkCigarRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r]; const name = (cells[iName] ?? '').trim();
    if (!name) continue;
    rows.push({ name, size: iSize >= 0 ? cells[iSize]?.trim() : undefined, country: iCountry >= 0 ? cells[iCountry]?.trim() : undefined,
      price: iPrice >= 0 ? cells[iPrice]?.trim() : undefined, status: iStatus >= 0 ? cells[iStatus]?.trim() : undefined, imageUrl: iImg >= 0 ? cells[iImg]?.trim() : undefined });
  }
  return { rows, error: rows.length ? null : 'No cigars found.' };
}

export function CsvCigarImport({ onImported, onClose }: { onImported: () => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<BulkCigarRow[]>([]);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function ingest(t: string) { setText(t); setResult(null); const { rows, error } = toRows(t); setRows(rows); setParseErr(error); }
  function onFile(f?: File) { if (!f) return; const reader = new FileReader(); reader.onload = () => ingest(String(reader.result || '')); reader.readAsText(f); }
  function template() {
    const csv = 'name,size,country,price,status,image_url\n"Padrón 1964 Anniversary","Robusto 5x50","Nicaragua","18.50","available","https://yoursite.com/images/p1964.jpg"\n"New Blend 2026","Toro 6x52","Dominican Republic","12.00","coming_soon","https://yoursite.com/images/new.jpg"';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'myhumidor-cigar-template.csv'; a.click();
  }
  async function importNow() {
    setBusy(true); const r = await bulkAddCigars(rows); setBusy(false);
    if (!r.ok) { setResult(r.error ?? 'Import failed.'); return; }
    setResult(`Imported ${r.inserted} cigar${r.inserted === 1 ? '' : 's'}${r.skipped ? `, skipped ${r.skipped}` : ''}.`);
    setText(''); setRows([]); onImported();
  }

  const input = 'w-full rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/20 bg-char/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-paper"><FileSpreadsheet size={16} className="text-ember-400" /> Bulk import (CSV)</div>
        <button onClick={onClose} className="text-smoke-400 hover:text-paper"><X size={16} /></button>
      </div>
      <p className="mt-1 text-xs text-smoke-400">Columns: <code className="text-ember-100">{COLS.join(', ')}</code>. Image links must be public URLs (hosted on your site or elsewhere). Status: available, coming_soon, or discontinued.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs text-ember-100 hover:bg-ember-400/10"><Upload size={13} /> Upload .csv<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} /></label>
        <button onClick={template} className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/20 px-3 py-2 text-xs text-smoke-200 hover:text-paper"><Download size={13} /> Download template</button>
      </div>
      <textarea className={input + ' mt-2 min-h-[120px] font-mono text-xs'} placeholder="…or paste CSV here (first row = headers)" value={text} onChange={(e) => ingest(e.target.value)} />
      {parseErr && text && <p className="mt-1 text-sm text-amber-300">{parseErr}</p>}
      {rows.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-smoke-300">{rows.length} cigar{rows.length === 1 ? '' : 's'} ready · preview: {rows.slice(0, 3).map((r) => r.name).join(', ')}{rows.length > 3 ? '…' : ''}</p>
          <button onClick={importNow} disabled={busy} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
            {busy ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : `Import ${rows.length} cigars`}
          </button>
        </div>
      )}
      {result && <p className="mt-2 text-sm text-ember-200">{result}</p>}
    </div>
  );
}
