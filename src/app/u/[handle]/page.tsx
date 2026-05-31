'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Loader2, UserX } from 'lucide-react';
import { getProfile, type ProfileFields } from '@/lib/profile';
import { getCollection, type CollectionItem } from '@/lib/collection';
import { getRatings, type UserRating } from '@/lib/ratings';
import { ProfileBody } from '@/components/ProfileBody';
import { Avatar } from '@/components/Avatar';

export default function PublicProfilePage() {
  const params = useParams();
  const handle = String(params.handle ?? '');
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<ProfileFields | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);

  useEffect(() => {
    // DEMO: profile data lives in this browser, so we can only resolve the
    // current user's own handle. PRODUCTION: fetch the profile, humidor,
    // wishlist, and ratings for `handle` from Supabase (public, RLS-allowed).
    const me = getProfile();
    if (me.handle === handle) {
      setProfile(me);
      setCollection(getCollection());
      setRatings(getRatings());
    }
    setLoaded(true);
  }, [handle]);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-20 text-center text-smoke-400">
        <Loader2 className="mx-auto animate-spin text-ember-400" size={24} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 pt-16 text-center">
        <UserX className="mx-auto text-smoke-400" size={32} strokeWidth={1.5} />
        <h1 className="font-display mt-4 text-3xl">@{handle}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-smoke-300">
          This profile is served from the database in production. In this local demo, only your own
          profile is available offline.
        </p>
        <Link href="/profile" className="btn-primary mt-5">
          Go to your profile
        </Link>
      </div>
    );
  }

  const humidor = collection.filter((c) => c.status === 'humidor');
  const wishlist = collection.filter((c) => c.status === 'wishlist');

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <div className="flex flex-col gap-6 border-b border-ember-400/15 pb-8 sm:flex-row sm:items-end">
        <Avatar profile={profile} />
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1">Member profile</div>
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
        </div>
      </div>

      <div className="mt-8">
        <ProfileBody humidor={humidor} wishlist={wishlist} ratings={ratings} self={false} />
      </div>
    </div>
  );
}
