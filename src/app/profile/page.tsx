'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2, MapPin, Share2, X, ShieldCheck, ShieldOff } from 'lucide-react';
import { subscribeAuth, type Session } from '@/lib/auth';
import { isAdmin, isBootstrapAdmin, promoteAdmin, revokeAdmin, onAdminsChange } from '@/lib/admin';
import { getProfile, saveProfile, onProfileChange, handleFromName, type ProfileFields } from '@/lib/profile';
import { getCollection, onCollectionChange, type CollectionItem } from '@/lib/collection';
import { getRatings, onRatingsChange, type UserRating } from '@/lib/ratings';
import { ProfileBody } from '@/components/ProfileBody';
import { Avatar } from '@/components/Avatar';
import { AdminOnlyId } from '@/components/AdminOnlyId';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'in' | 'out'>('checking');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileFields | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [editing, setEditing] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const sync = () => setAdmin(isAdmin(session?.publicId));
    sync();
    return onAdminsChange(sync);
  }, [session]);

  useEffect(() => {
    return subscribeAuth((s) => {
      if (s) {
        setSession(s);
        setAuthState('in');
      } else {
        setAuthState('out');
        router.replace('/register?next=/profile');
      }
    });
  }, [router]);

  useEffect(() => {
    const sync = () => {
      setProfile(getProfile());
      setCollection(getCollection());
      setRatings(getRatings());
    };
    sync();
    const u1 = onProfileChange(sync);
    const u2 = onCollectionChange(sync);
    const u3 = onRatingsChange(sync);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [authState]);

  if (authState !== 'in' || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-20 text-center text-smoke-400">
        <Loader2 className="mx-auto animate-spin text-ember-400" size={24} />
      </div>
    );
  }

  const humidor = collection.filter((c) => c.status === 'humidor');
  const wishlist = collection.filter((c) => c.status === 'wishlist');

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <div className="flex flex-col gap-6 border-b border-ember-400/15 pb-8 sm:flex-row sm:items-end">
        <Avatar profile={profile} editable onChange={(url) => saveProfile({ avatarDataUrl: url })} />

        <div className="min-w-0 flex-1">
          {session?.type === 'lounge' ? (
            <div className="eyebrow mb-1">Lounge account</div>
          ) : (
            <div className="eyebrow mb-1">Member</div>
          )}
          <h1 className="font-display text-4xl tracking-tightest sm:text-5xl">{profile.displayName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-smoke-300">
            <span className="text-smoke-400">@{profile.handle}</span>
            {profile.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} strokeWidth={1.5} className="text-ember-400" />
                {[profile.city, profile.state].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
          {profile.bio && <p className="mt-2 max-w-xl text-sm text-smoke-200">{profile.bio}</p>}
          {session && session.type === 'lounge' && (
            <div className="mt-2 font-mono text-[11px] text-smoke-500">{session.publicId}</div>
          )}
          {session && <AdminOnlyId id={session.publicId} label="User UUID" />}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button onClick={() => setEditing((v) => !v)} className="btn-ghost text-xs">
            {editing ? 'Close' : 'Edit profile'}
          </button>
          <Link href={`/u/${profile.handle}`} className="btn-ghost text-xs">
            <Share2 size={13} strokeWidth={1.5} /> Public view
          </Link>
          {session && !isBootstrapAdmin(session.publicId) && (
            <button
              onClick={() => (admin ? revokeAdmin(session.publicId) : promoteAdmin(session.publicId))}
              className="btn-ghost text-xs"
              title="Demo control — toggle super-admin access"
            >
              {admin ? (
                <>
                  <ShieldOff size={13} strokeWidth={1.5} /> Exit admin (demo)
                </>
              ) : (
                <>
                  <ShieldCheck size={13} strokeWidth={1.5} className="text-ember-400" /> Become super admin (demo)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {editing && <EditForm profile={profile} onDone={() => setEditing(false)} />}

      <div className="mt-8">
        <ProfileBody humidor={humidor} wishlist={wishlist} ratings={ratings} self />
      </div>
    </div>
  );
}

function EditForm({ profile, onDone }: { profile: ProfileFields; onDone: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [city, setCity] = useState(profile.city);
  const [state, setState] = useState(profile.state);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    // TODO: in production, update public.profiles + auth metadata via Supabase.
    saveProfile({
      displayName: displayName.trim() || 'Member',
      handle: handleFromName(displayName.trim() || 'member'),
      city: city.trim(),
      state: state.trim(),
      bio: bio.trim(),
    });
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    onDone();
  }

  return (
    <div className="mt-6 rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="Tampa" />
          </Field>
          <Field label="State">
            <input value={state} onChange={(e) => setState(e.target.value)} className={inputCls} placeholder="FL" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Maduro guy. Always chasing the perfect burn."
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-ember-400 px-5 py-2 text-sm font-medium text-paper transition hover:bg-ember-600 disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2} />}
          Save profile
        </button>
        <button onClick={onDone} className="btn-ghost text-sm">
          <X size={14} strokeWidth={1.5} /> Cancel
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
