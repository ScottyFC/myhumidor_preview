'use client';

import { useEffect, useState } from 'react';
import { amMemberOf } from '@/lib/lounges-owner';
import { PostComposer } from '@/components/PostComposer';

/**
 * Shows the post composer on a lounge's public page only to its owners/members.
 * Everyone else just sees the read-only LoungePosts list rendered separately.
 */
export function LoungeOwnerComposer({ slug, loungeName }: { slug: string; loungeName?: string }) {
  const [owner, setOwner] = useState<boolean | null>(null);
  useEffect(() => {
    let off = false;
    amMemberOf(slug).then((v) => !off && setOwner(v));
    return () => { off = true; };
  }, [slug]);

  if (!owner) return null;
  return <PostComposer slug={slug} loungeName={loungeName} />;
}
