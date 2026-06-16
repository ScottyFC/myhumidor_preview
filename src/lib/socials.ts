'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import type { Json } from '@/types/database.types';

export interface Socials {
  instagram?: string;
  x?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}

export const SOCIAL_FIELDS: { key: keyof Socials; label: string; prefix: string }[] = [
  { key: 'instagram', label: 'Instagram', prefix: '@' },
  { key: 'x', label: 'X (Twitter)', prefix: '@' },
  { key: 'facebook', label: 'Facebook', prefix: 'fb.com/' },
  { key: 'tiktok', label: 'TikTok', prefix: '@' },
  { key: 'youtube', label: 'YouTube', prefix: '@' },
  { key: 'website', label: 'Website', prefix: 'https://' },
];

export function socialUrl(key: keyof Socials, v: string): string {
  const h = v.replace(/^@/, '').trim();
  switch (key) {
    case 'instagram': return `https://instagram.com/${h}`;
    case 'x': return `https://x.com/${h}`;
    case 'facebook': return h.startsWith('http') ? h : `https://facebook.com/${h}`;
    case 'tiktok': return `https://tiktok.com/@${h}`;
    case 'youtube': return `https://youtube.com/@${h}`;
    case 'website': return h.startsWith('http') ? h : `https://${h}`;
    default: return '#';
  }
}

async function getSocials(table: 'profiles' | 'lounges', match: Record<string, string>): Promise<Socials> {
  if (!isSupabaseConfigured) return {};
  try {
    let q = supabaseBrowser().from(table).select('socials');
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    const { data } = await q.single();
    return (data?.socials as Socials) ?? {};
  } catch {
    return {};
  }
}

async function saveSocials(table: 'profiles' | 'lounges', match: Record<string, string>, socials: Socials): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    let q = supabaseBrowser().from(table).update({ socials: socials as unknown as Json });
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    const { error } = await q;
    return !error;
  } catch {
    return false;
  }
}

export const getProfileSocials = (userId: string) => getSocials('profiles', { id: userId });
export const saveProfileSocials = (userId: string, s: Socials) => saveSocials('profiles', { id: userId }, s);
export const getLoungeSocials = (slug: string) => getSocials('lounges', { slug });
export const saveLoungeSocials = (slug: string, s: Socials) => saveSocials('lounges', { slug }, s);
