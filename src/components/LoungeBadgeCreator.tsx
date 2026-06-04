'use client';

import { useEffect, useState } from 'react';
import { Award, Loader2, Plus, Lock } from 'lucide-react';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';
import { createLoungeBadge, listLoungeBadges, type BadgeDef } from '@/lib/badges';
import { BadgeMedal } from '@/components/BadgeMedal';

export function LoungeBadgeCreator({ slug }: { slug: string }) {
  const [loungeId, setLoungeId] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('basic');
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: l } = await supabaseBrowser().from('lounges').select('id, tier').eq('slug', slug).single();
      if (l) {
        setLoungeId(l.id);
        setTier(l.tier ?? 'basic');
        setBadges(await listLoungeBadges(l.id));
      }
    })();
  }, [slug]);

  const isPremium = tier === 'premium' || tier === 'elite';

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !loungeId) return;
    setBusy(true);
    try {
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const path = `badges/${loungeId}-${Date.now()}.${ext}`;
      const sb = supabaseBrowser();
      const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (error) setMsg(error.message);
      else setImageUrl(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!name.trim() || !loungeId) return;
    setBusy(true);
    setMsg('');
    const ok = await createLoungeBadge({ loungeId, name: name.trim(), description: desc.trim() || undefined, imageUrl: imageUrl || undefined });
    setBusy(false);
    if (ok) {
      setName('');
      setDesc('');
      setImageUrl('');
      setBadges(await listLoungeBadges(loungeId));
    } else {
      setMsg("Couldn't create the badge — confirm this lounge is on the Premium tier and you're a member.");
    }
  }

  return (
    <div className="mt-8">
      <div className="eyebrow mb-3">Custom badge</div>
      <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-5">
        {!isPremium ? (
          <div className="flex items-start gap-3 text-sm text-smoke-300">
            <Lock size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ember-400" />
            <div>
              Custom collectible badges are a <span className="text-ember-100">Premium</span> feature. Upgrade your
              lounge to design a badge your regulars can collect.
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Award size={16} strokeWidth={1.5} className="text-ember-400" />
              <span className="text-sm text-smoke-200">Design a badge your visitors can collect.</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Badge name (e.g. Founders Lounge Regular)"
                className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none" />
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description"
                className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs text-ember-100 hover:bg-ember-400/10">
                Upload artwork
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="preview" className="h-12 w-12 rounded-md object-contain" />
              )}
              <button onClick={create} disabled={busy || !name.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-ember-400 px-4 py-2 text-sm font-medium text-paper hover:bg-ember-600 disabled:opacity-60">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={1.5} />} Create badge
              </button>
              {msg && <span className="text-xs text-smoke-400">{msg}</span>}
            </div>
          </>
        )}

        {badges.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {badges.map((b) => (
              <BadgeMedal key={b.id} badge={b} earned size={96} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
