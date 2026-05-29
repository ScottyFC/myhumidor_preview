'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import type { CigarComment, CigarSocial } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export function CigarCommunity({ social }: { social: CigarSocial }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(social.likes);
  const [comments, setComments] = useState<CigarComment[]>(social.comments);
  const [draft, setDraft] = useState('');

  function toggleLike() {
    setLiked((v) => {
      setLikes((n) => n + (v ? -1 : 1));
      return !v;
    });
  }

  function postComment() {
    const body = draft.trim();
    if (!body) return;
    // TODO: persist to `comments` table via Supabase once auth is wired.
    const c: CigarComment = {
      id: `local_${Date.now()}`,
      author: 'You',
      handle: 'you',
      body,
      createdAt: 'now',
      likes: 0,
    };
    setComments((prev) => [c, ...prev]);
    setDraft('');
  }

  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/60 p-6">
      <div className="flex items-center justify-between border-b border-ember-400/10 pb-4">
        <div className="eyebrow">Community</div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLike}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm transition',
              liked ? 'text-ember-100' : 'text-smoke-200 hover:text-paper'
            )}
            aria-pressed={liked}
          >
            <Heart
              size={16}
              strokeWidth={1.5}
              className={cn(liked && 'fill-ember-400 text-ember-400')}
            />
            <span className="tabular">{likes.toLocaleString()}</span>
          </button>
          <span className="inline-flex items-center gap-1.5 text-sm text-smoke-200">
            <MessageCircle size={16} strokeWidth={1.5} />
            <span className="tabular">{comments.length}</span>
          </span>
        </div>
      </div>

      {/* Composer */}
      <div className="mt-4 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && postComment()}
          placeholder="Share a note on this cigar…"
          className="flex-1 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
        />
        <button
          onClick={postComment}
          disabled={!draft.trim()}
          aria-label="Post comment"
          className={cn(
            'rounded-md p-2 transition',
            draft.trim() ? 'bg-ember-400 text-paper hover:bg-ember-600' : 'bg-smoke-800 text-smoke-400'
          )}
        >
          <Send size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Thread */}
      <div className="mt-5 space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember-600/30 font-display text-sm text-ember-100">
              {c.author.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{c.author}</span>
                <span className="text-xs text-smoke-400">@{c.handle}</span>
                <span className="text-xs text-smoke-400">· {c.createdAt}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-smoke-100">{c.body}</p>
              <button className="mt-1.5 inline-flex items-center gap-1 text-xs text-smoke-400 hover:text-ember-100">
                <Heart size={11} strokeWidth={1.5} /> {c.likes > 0 ? c.likes : 'Like'}
              </button>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="py-4 text-center text-sm text-smoke-400">
            Be the first to weigh in on this cigar.
          </div>
        )}
      </div>
    </div>
  );
}
