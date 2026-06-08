'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Loader2, UserX, Crown } from 'lucide-react';
import { getProfile, fetchProfileByHandle, type ProfileFields } from '@/lib/profile';
import { getSession } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getCollection, fetchCollectionFor, type CollectionItem } from '@/lib/collection';
import { getRatings, fetchRatingsFor, type UserRating } from '@/lib/ratings';
import { ProfileBody } from '@/components/ProfileBody';
import { BadgesSection } from '@/components/BadgesSection';
import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { AdminOnlyId } from '@/components/AdminOnlyId';
import { RemoveProfileButton } from '@/components/RemoveProfileButton';
import { FollowStats } from '@/components/FollowStats';
import { ProfileSocialLinks } from '@/components/SocialLinks';
import { ActivityFeed } from '@/components/ActivityFeed';

export default function PublicProfilePage() {
  const params = useParams();
  const handle = String(params.handle ?? '');
  const [loaded, setLoaded] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [viewedId, setViewedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileFields | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const me = getProfile();
      const meIsTarget = me.handle === handle;
      setIsSelf(meIsTarget);

      if (isSupabaseConfigured) {
        // Supabase: resolve any member by handle. For yourself, use the live
        // local cache so edits reflect immediately; for others, fetch theirs.
        if (meIsTarget) {
          setProfile(me);
          setViewedId(getSession()?.publicId ?? null);
          setCollection(getCollection());
          setRatings(getRatings());
        } else {
          const found = await fetchProfileByHandle(handle);
          if (cancelled) return;
          if (found) {
            setProfile(found.profile);
            setViewedId(found.publicId);
            const [coll, rts] = await Promise.all([
              fetchCollectionFor(found.userId),
              fetchRatingsFor(found.userId),
            ]);
            if (cancelled) return;
            setCollection(coll);
            setRatings(rts);
          }
        }
      } else if (meIsTarget) {
        // Demo: only your own handle resolves locally.
        setProfile(me);
        setViewedId(getSession()?.publicId ?? null);
        setCollection(getCollection());
        setRatings(getRatings());
      }
      if (!cancelled) setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
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
        <Avatar profile={profile} size={112} />
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1">Member profile</div>
          <h1 className="font-display text-4xl tracking-tightest sm:text-5xl">{profile.displayName}</h1>
          {profile.aficionado && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-ember-400/40 bg-ember-400/10 px-2.5 py-0.5 text-xs font-medium text-ember-100">
              <Crown size={12} strokeWidth={1.5} className="text-ember-400" /> Verified Aficionado
            </div>
          )}
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
          {viewedId && <FollowStats userId={viewedId} />}
          {viewedId && <ProfileSocialLinks userId={viewedId} />}
          {viewedId && <AdminOnlyId id={viewedId} label="User UUID" />}
          {!isSelf && <RemoveProfileButton handle={profile.handle} displayName={profile.displayName} />}
        </div>
        {!isSelf && (
          <div className="shrink-0">
            <FollowButton handle={profile.handle} />
          </div>
        )}
      </div>

      <div className="mt-8">
        {viewedId && <BadgesSection userId={viewedId} self={isSelf} humidor={humidor} ratings={ratings} />}
        {viewedId && <ActivityFeed userId={viewedId} ratings={ratings} title="Activity" />}
        <ProfileBody humidor={humidor} wishlist={wishlist} ratings={ratings} self={false} />
      </div>
    </div>
  );
}
