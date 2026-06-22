'use client';

import { useEffect, useState } from 'react';
import { Clock, UtensilsCrossed, Upload, Loader2, Check, Mail, Image as ImageIcon } from 'lucide-react';
import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';
import { getMyLounges, updateLoungeDetails, uploadMenuPdf, uploadBannerImage, type LoungeHours } from '@/lib/lounges-owner';

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
  const [hideEmail, setHideEmail] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingMenu, setUploadingMenu] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const mine = await getMyLounges();
      const l = mine.find((x) => x.certified) ?? mine[0];
      if (!l) return;
      setSlug(l.slug); setName(l.name); setCertified(!!l.certified);
      if (isSupabaseConfigured) {
        const { data } = await supabaseBrowser().from('lounges')
          .select('hours_json, serves_food, menu_url, hide_email, banner_url').eq('slug', l.slug).single();
        if (data) {
          setHours((data.hours_json as LoungeHours) ?? {});
          setServesFood(!!data.serves_food);
          setMenuUrl(data.menu_url ?? null);
          setHideEmail(!!data.hide_email);
          setBannerUrl(data.banner_url ?? null);
        }
      }
    })();
  }, []);

  if (!slug) return null;

  async function save() {
    setBusy(true); setSaved(false);
    const ok = await updateLoungeDetails(slug!, { hoursJson: hours, servesFood: certified ? servesFood : undefined, menuUrl: certified ? menuUrl : undefined, hideEmail: certified ? hideEmail : undefined, bannerUrl: certified ? bannerUrl : undefined });
    setBusy(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  async function onMenu(file?: File) {
    setUploadErr(null); setUploadOk(null);
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setUploadErr('Please choose a PDF file for the menu.'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadErr('Menu PDF must be under 10 MB.'); return; }
    setUploadingMenu(true);
    const { url, error } = await uploadMenuPdf(file);
    setUploadingMenu(false);
    if (error || !url) { setUploadErr(error ?? 'Upload failed.'); return; }
    setMenuUrl(url);
    // Confirm the upload by persisting it immediately (full form, so nothing else is cleared).
    const ok = await updateLoungeDetails(slug!, { hoursJson: hours, servesFood: certified ? servesFood : undefined, menuUrl: url, hideEmail: certified ? hideEmail : undefined, bannerUrl: certified ? bannerUrl : undefined });
    setUploadOk(ok ? 'Menu uploaded and saved ✓' : 'Uploaded — but saving failed. Click Save to retry.');
  }

  async function onBanner(file?: File) {
    setUploadErr(null); setUploadOk(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadErr('Please choose an image file for the banner.'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadErr('Banner image must be under 5 MB.'); return; }
    setUploadingBanner(true);
    const { url, error } = await uploadBannerImage(file);
    setUploadingBanner(false);
    if (error || !url) { setUploadErr(error ?? 'Upload failed.'); return; }
    setBannerUrl(url);
    const ok = await updateLoungeDetails(slug!, { hoursJson: hours, servesFood: certified ? servesFood : undefined, menuUrl: certified ? menuUrl : undefined, hideEmail: certified ? hideEmail : undefined, bannerUrl: url });
    setUploadOk(ok ? 'Banner uploaded and saved ✓' : 'Uploaded — but saving failed. Click Save to retry.');
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
                {uploadingMenu ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Upload size={13} /> {menuUrl ? 'Replace menu PDF' : 'Upload menu PDF'}</>}
                <input type="file" accept="application/pdf" className="hidden" disabled={uploadingMenu} onChange={(e) => onMenu(e.target.files?.[0])} />
              </label>
              {menuUrl && <a href={menuUrl} target="_blank" rel="noreferrer" className="ml-3 text-xs text-ember-400 underline">View current menu</a>}
            </div>
          )}

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-smoke-200">
            <input type="checkbox" checked={hideEmail} onChange={(e) => setHideEmail(e.target.checked)} className="accent-ember-400" />
            <Mail size={14} className="text-ember-400" /> Hide my email address on my public page
          </label>

          <div className="mt-4">
            <div className="mb-1 text-sm text-smoke-200">Banner image</div>
            {bannerUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={bannerUrl} alt="Banner preview" className="mb-2 aspect-[3/1] w-full rounded-lg border-[0.5px] border-ember-400/15 object-cover" />
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs text-ember-100 hover:bg-ember-400/10">
              {uploadingBanner ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><ImageIcon size={13} /> {bannerUrl ? 'Replace banner' : 'Upload banner'}</>}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner} onChange={(e) => onBanner(e.target.files?.[0])} />
            </label>
            <p className="mt-1 text-[11px] text-smoke-500">Wide image (3:1) shown at the top of your lounge page. JPG or PNG, under 5 MB.</p>
          </div>

          {(uploadErr || uploadOk) && (
            <div className={`mt-3 rounded-lg border-[0.5px] px-3 py-2 text-xs ${uploadErr ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-ember-400/30 bg-ember-400/10 text-ember-100'}`}>
              {uploadErr ?? uploadOk}
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
