'use client';

import { useEffect, useState } from 'react';
import { Instagram, Twitter, Facebook, Youtube, Globe, Music2, Loader2, Check } from 'lucide-react';
import {
  type Socials, SOCIAL_FIELDS, socialUrl,
  getProfileSocials, saveProfileSocials, getLoungeSocials, saveLoungeSocials,
} from '@/lib/socials';

const ICON: Record<keyof Socials, typeof Globe> = {
  instagram: Instagram, x: Twitter, facebook: Facebook, tiktok: Music2, youtube: Youtube, website: Globe,
};

export function SocialLinks({ socials }: { socials?: Socials }) {
  if (!socials) return null;
  const entries = SOCIAL_FIELDS.filter((f) => socials[f.key]);
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map((f) => {
        const Icon = ICON[f.key];
        return (
          <a key={f.key} href={socialUrl(f.key, socials[f.key]!)} target="_blank" rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full border-[0.5px] border-ember-400/25 bg-char/60 text-smoke-200 transition hover:border-ember-400/50 hover:text-ember-100"
            title={f.label} aria-label={f.label}>
            <Icon size={15} strokeWidth={1.5} />
          </a>
        );
      })}
    </div>
  );
}

/** Inline editor used in profile edit + lounge dashboard. owner: profile userId OR lounge slug. */
export function SocialLinksEditor({ kind, owner }: { kind: 'profile' | 'lounge'; owner: string }) {
  const [s, setS] = useState<Socials>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (kind === 'profile' ? getProfileSocials(owner) : getLoungeSocials(owner)).then(setS);
  }, [kind, owner]);

  async function save() {
    setSaving(true);
    const ok = kind === 'profile' ? await saveProfileSocials(owner, s) : await saveLoungeSocials(owner, s);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1800); }
  }

  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/20 p-4">
      <div className="eyebrow mb-3">Social links</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {SOCIAL_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/15 bg-char/80 px-2.5">
            <span className="shrink-0 text-xs text-smoke-400">{f.prefix}</span>
            <input
              value={s[f.key] ?? ''}
              onChange={(e) => setS((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.label}
              className="w-full bg-transparent py-2 text-sm text-paper placeholder:text-smoke-500 focus:outline-none"
            />
          </label>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs font-medium text-ember-100 hover:bg-ember-400/10 disabled:opacity-60">
        {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} strokeWidth={2} /> : null}
        {saved ? 'Saved' : 'Save social links'}
      </button>
    </div>
  );
}

export function ProfileSocialLinks({ userId }: { userId: string }) {
  const [s, setS] = useState<Socials | null>(null);
  useEffect(() => { getProfileSocials(userId).then(setS); }, [userId]);
  return s ? <SocialLinks socials={s} /> : null;
}

export function LoungeSocialLinks({ slug }: { slug: string }) {
  const [s, setS] = useState<Socials | null>(null);
  useEffect(() => { getLoungeSocials(slug).then(setS); }, [slug]);
  return s ? <SocialLinks socials={s} /> : null;
}
