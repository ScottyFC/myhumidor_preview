'use client';

import { useEffect, useState } from 'react';
import { Clock, UtensilsCrossed, Upload, Loader2, Check } from 'lucide-react';
import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';
import { getMyLounges, updateLoungeDetails, uploadMenuPdf, type LoungeHours } from '@/lib/lounges-owner';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Owner dashboard: set opening hours; certified lounges also get a food badge
 *  + menu PDF. */
export function LoungeDetailsEditor() {
  const [slug, setSlug] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [certified, setCertified] = useState(false);
  const [hours, setHours] = useState<LoungeHours>({});
  const [servesFood, setServesFood] = useState(false);
  const [menuUrl, setMenuUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const mine = await getMyLounges();
      const l = mine.find((x) => x.certified) ?? mine[0];
      if (!l) return;
      setSlug(l.slug); setName(l.name); setCertified(!!l.certified);
      if (isSupabaseConfigured) {
        const { data } = await supabaseBrowser().from('lounges')
          .select('hours_json, serves_food, menu_url').eq('slug', l.slug).single();
        if (data) {
          setHours((data.hours_json as LoungeHours) ?? {});
          setServesFood(!!data.serves_food);
          setMenuUrl(data.menu_url ?? null);
        }
      }
    })();
  }, []);

  if (!slug) return null;

  async function save() {
    setBusy(true); setSaved(false);
    const ok = await updateLoungeDetails(slug!, { hoursJson: hours, servesFood: certified ? servesFood : undefined, menuUrl: certified ? menuUrl : undefined });
    setBusy(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  async function onMenu(file?: File) {
    if (!file) return;
    setBusy(true);
    const url = await uploadMenuPdf(file);
    setBusy(false);
    if (url) setMenuUrl(url);
  }

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex items-center gap-2">
        <Clock size={16} className="text-ember-400" />
        <h3 className="font-display text-lg">Hours & details <span className="text-sm text-smoke-400">· {name}</span></h3>
      </div>

      <div className="space-y-2">
        {DAYS.map((d) => (
          <div key={d} className="flex items-center gap-3">
            <span className="w-10 text-sm text-smoke-400">{d}</span>
            <input
              value={hours[d] ?? ''}
              onChange={(e) => setHours((h) => ({ ...h, [d]: e.target.value }))}
              placeholder="10:00–22:00 or Closed"
              className="flex-1 rounded-lg border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-1.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {certified ? (
        <div className="mt-5 border-t border-ember-400/10 pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-smoke-200">
            <input type="checkbox" checked={servesFood} onChange={(e) => setServesFood(e.target.checked)} className="accent-ember-400" />
            <UtensilsCrossed size={14} className="text-ember-400" /> We serve food
          </label>
          {servesFood && (
            <div className="mt-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs text-ember-100 hover:bg-ember-400/10">
                <Upload size={13} /> {menuUrl ? 'Replace menu PDF' : 'Upload menu PDF'}
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onMenu(e.target.files?.[0])} />
              </label>
              {menuUrl && <a href={menuUrl} target="_blank" rel="noreferrer" className="ml-3 text-xs text-ember-400 underline">View current menu</a>}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs text-smoke-500">Food badge and menu uploads are available on certified lounges.</p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save details
        </button>
        {saved && <span className="inline-flex items-center gap-1 text-xs text-ember-100"><Check size={12} strokeWidth={2} /> Saved</span>}
      </div>
    </div>
  );
}
