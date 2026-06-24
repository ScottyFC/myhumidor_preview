'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Cigarette, ExternalLink, Plus, Trash2, ImageIcon, Upload, FileSpreadsheet, Pencil, Check, X } from 'lucide-react';
import { getBrandCigars, addBrandCigar, updateBrandCigarStatus, updateBrandCigar, removeBrandCigar, uploadBrandImage, type BrandCigar, type CigarStatus } from '@/lib/brands';
import { CsvCigarImport } from '@/components/CsvCigarImport';

const STATUS_OPTS: [CigarStatus, string][] = [['available', 'Available'], ['coming_soon', 'Coming Soon'], ['discontinued', 'Discontinued']];
function StatusBadge({ s }: { s: CigarStatus }) {
  if (s === 'available') return null;
  const cls = s === 'coming_soon' ? 'bg-sky-500/15 text-sky-300' : 'bg-zinc-500/15 text-zinc-300';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${cls}`}>{s === 'coming_soon' ? 'Coming Soon' : 'Discontinued'}</span>;
}

export function ListedCigars({ slug }: { slug: string }) {
  const [rows, setRows] = useState<BrandCigar[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [form, setForm] = useState({ name: '', size: '', country: '', price: '', status: 'available' as CigarStatus });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => setRows(await getBrandCigars()), []);
  useEffect(() => { load(); }, [load]);

  function pickImage(f?: File) {
    setErr(null);
    if (!f) { setImageFile(null); setImagePreview(null); return; }
    if (!f.type.startsWith('image/')) { setErr('Please choose an image.'); return; }
    if (f.size > 8 * 1024 * 1024) { setErr('Image must be under 8 MB.'); return; }
    setImageFile(f); setImagePreview(URL.createObjectURL(f));
  }

  async function add() {
    setErr(null);
    if (!form.name.trim()) { setErr('Enter a cigar name.'); return; }
    setBusy(true);
    let imageUrl: string | null = null;
    if (imageFile) {
      const up = await uploadBrandImage('cigar', imageFile);
      if (up.error || !up.url) { setBusy(false); setErr(up.error ?? 'Image upload failed.'); return; }
      imageUrl = up.url;
    }
    const r = await addBrandCigar({ name: form.name.trim(), size: form.size.trim() || undefined, country: form.country.trim() || undefined, price: form.price.trim() || null, status: form.status, imageUrl });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? 'Could not add cigar.'); return; }
    setForm({ name: '', size: '', country: '', price: '', status: 'available' }); setImageFile(null); setImagePreview(null); setAdding(false); load();
  }
  async function setStatus(id: string, status: CigarStatus) { setRows((rs) => rs ? rs.map((c) => c.id === id ? { ...c, status } : c) : rs); await updateBrandCigarStatus(id, status); }
  async function remove(id: string) { setRows((rs) => rs ? rs.filter((c) => c.id !== id) : rs); await removeBrandCigar(id); }

  const input = 'rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  const owned = rows?.filter((c) => c.owned) ?? [];
  const cataloged = rows?.filter((c) => !c.owned) ?? [];

  return (
    <section id="listed-cigars" className="mt-8 scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Cigarette size={18} className="text-ember-400" /> Listed Cigars{rows && <span className="text-sm text-smoke-400">· {rows.length}</span>}</h2>
        <div className="flex items-center gap-3">
          <Link href={`/brands/${slug}`} className="inline-flex items-center gap-1.5 text-xs text-ember-400 hover:underline">View brand page <ExternalLink size={12} /></Link>
          <button onClick={() => setBulk((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs text-ember-100 hover:bg-ember-400/10"><FileSpreadsheet size={13} /> Bulk import</button>
          <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper"><Plus size={13} /> Add cigar</button>
        </div>
      </div>

      {adding && (
        <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/20 bg-char/40 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={input} placeholder="Cigar name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder="Size / vitola (e.g. Robusto 5×50)" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            <input className={input} placeholder="Country (e.g. Nicaragua)" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <input className={input} inputMode="decimal" placeholder="MSRP (USD, optional)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="mt-2 flex items-center gap-3">
            {imagePreview
              ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={imagePreview} alt="" className="h-14 w-12 rounded object-cover" />
              : <span className="flex h-14 w-12 items-center justify-center rounded bg-char/60 text-smoke-500"><ImageIcon size={16} /></span>}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs text-ember-100 hover:bg-ember-400/10">
              <Upload size={13} /> {imageFile ? 'Change photo' : 'Add photo'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
            </label>
            {imageFile && <button onClick={() => pickImage(undefined)} className="text-xs text-smoke-400 hover:text-paper">Remove</button>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CigarStatus })}>
              {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button onClick={add} disabled={busy || !form.name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add to catalog
            </button>
            <button onClick={() => { setAdding(false); setErr(null); }} className="text-xs text-smoke-400 hover:text-paper">Cancel</button>
          </div>
          {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
        </div>
      )}

      {bulk && <CsvCigarImport onImported={load} onClose={() => setBulk(false)} />}

      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        {rows === null ? <Loader2 className="animate-spin text-ember-400" /> : rows.length === 0 ? (
          <p className="text-sm text-smoke-400">No cigars listed yet. Use <strong>Add cigar</strong> to build your catalog — they appear on your public brand page in real time.</p>
        ) : (
          <div className="space-y-4">
            {owned.length > 0 && (
              <div className="divide-y divide-ember-400/10">
                <div className="pb-2 text-[11px] uppercase tracking-wide text-smoke-500">Your catalog</div>
                {owned.map((c) => (
                  <OwnedRow key={c.slug} c={c} onStatus={setStatus} onRemove={remove} onSaved={load} />
                ))}
              </div>
            )}
            {cataloged.length > 0 && (
              <div className="divide-y divide-ember-400/10">
                <div className="pb-2 text-[11px] uppercase tracking-wide text-smoke-500">From the MyHumidor catalog</div>
                {cataloged.map((c) => (
                  <Link key={c.slug} href={`/cigars/${c.slug}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-ember-100">
                    <span className="font-medium text-paper">{c.name}</span>
                    <span className="flex items-center gap-2 text-xs text-smoke-400"><StatusBadge s={c.status} />{[c.size, c.country].filter(Boolean).join(' · ')}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


const ROW_STATUS: [CigarStatus, string][] = [['available', 'Available'], ['coming_soon', 'Coming Soon'], ['discontinued', 'Discontinued']];

function OwnedRow({ c, onStatus, onRemove, onSaved }: { c: BrandCigar; onStatus: (id: string, s: CigarStatus) => void; onRemove: (id: string) => void; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: c.name, size: c.size, country: c.country, price: c.price != null ? String(c.price) : '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pick(f?: File) { setErr(null); if (!f) { setFile(null); setPreview(null); return; } if (!f.type.startsWith('image/')) return setErr('Choose an image.'); if (f.size > 8 * 1024 * 1024) return setErr('Under 8 MB please.'); setFile(f); setPreview(URL.createObjectURL(f)); }
  async function save() {
    if (!c.id) return;
    setErr(null);
    if (!form.name.trim()) return setErr('Name is required.');
    setBusy(true);
    let imageUrl: string | undefined;
    if (file) { const up = await uploadBrandImage('cigar', file); if (up.error || !up.url) { setBusy(false); return setErr(up.error ?? 'Photo upload failed.'); } imageUrl = up.url; }
    const r = await updateBrandCigar(c.id, { name: form.name.trim(), size: form.size, country: form.country, price: form.price || null, ...(imageUrl ? { imageUrl } : {}) });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? 'Could not save.');
    setEditing(false); setFile(null); setPreview(null); onSaved();
  }

  const input = 'rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-2.5 py-1.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  const thumb = preview ?? c.imageUrl;

  if (editing) {
    return (
      <div className="py-3">
        <div className="flex items-start gap-3">
          {thumb ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumb} alt="" className="h-16 w-12 shrink-0 rounded object-cover" /> : <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded bg-char/60 text-smoke-600"><ImageIcon size={16} /></span>}
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input className={input} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder="Size / vitola" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            <input className={input} placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <input className={input} inputMode="decimal" placeholder="MSRP (USD)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs text-ember-100 hover:bg-ember-400/10"><Upload size={13} /> {file ? 'Change photo' : 'Replace photo'}<input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save</button>
          <button onClick={() => { setEditing(false); setFile(null); setPreview(null); setErr(null); setForm({ name: c.name, size: c.size, country: c.country, price: c.price != null ? String(c.price) : '' }); }} className="inline-flex items-center gap-1 text-xs text-smoke-400 hover:text-paper"><X size={13} /> Cancel</button>
        </div>
        {err && <p className="mt-1 text-sm text-red-300">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        {c.imageUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.imageUrl} alt="" className="h-12 w-9 shrink-0 rounded object-cover" /> : <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-char/60 text-smoke-600"><ImageIcon size={14} /></span>}
        <div className="min-w-0">
          <Link href={`/cigars/${c.slug}`} className="font-medium text-paper hover:text-ember-100">{c.name}</Link>
          <span className="ml-2 text-xs text-smoke-400">{[c.size, c.country].filter(Boolean).join(' · ')}{typeof c.price === 'number' ? ` · $${c.price.toFixed(2)}` : ''}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select value={c.status} onChange={(e) => c.id && onStatus(c.id, e.target.value as CigarStatus)} className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 px-2 py-1 text-xs text-paper focus:outline-none">
          {ROW_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={() => setEditing(true)} className="text-smoke-400 hover:text-ember-100" aria-label="Edit"><Pencil size={15} /></button>
        <button onClick={() => c.id && onRemove(c.id)} className="text-smoke-400 hover:text-red-300" aria-label="Remove"><Trash2 size={15} /></button>
      </div>
    </div>
  );
}
