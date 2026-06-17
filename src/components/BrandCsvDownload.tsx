'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

interface Row {
  slug: string; brand: string; name: string; country?: string;
  price?: number | null; image_url?: string | null; buy_url?: string | null;
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Admin-only: download every cigar on this brand page as a bulk-tool-ready CSV. */
export function BrandCsvDownload({ brand, rows }: { brand: string; rows: Row[] }) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => subscribeAuth((s) => setAdmin(isAdmin(s?.publicId))), []);
  if (!admin || rows.length === 0) return null;

  function download() {
    const headers = ['slug', 'brand', 'name', 'country', 'price', 'image_url', 'buy_url', 'removed'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([r.slug, r.brand, r.name, r.country ?? '', r.price ?? '', r.image_url ?? '', r.buy_url ?? '', 'false'].map(csvCell).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.href = url; a.download = `myhumidor-${safe || 'brand'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={download} className="mt-4 inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs font-medium text-ember-100 hover:bg-ember-400/10">
      <Download size={13} strokeWidth={1.5} /> Admin · download brand CSV ({rows.length})
    </button>
  );
}
