'use client';

import { useEffect, useState } from 'react';
import { useAuthGate } from '@/lib/use-auth-gate';
import Link from 'next/link';
import { Heart, MessageCircle, Send, Loader2 } from 'lucide-react';
import {
  type TargetType, type Comment,
  getLikeInfo, toggleLike, getComments, commentCount, addComment, currentUserId,
} from '@/lib/engagement';

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function EngagementBar({
  type, id, ownerId, entityName,
}: {
  type: TargetType; id: string; ownerId?: string; entityName?: string;
}) {
  const gate = useAuthGate();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [cCount, setCCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    getLikeInfo(type, id).then((i) => { if (!off) { setLikes(i.count); setLiked(i.mine); } });
    commentCount(type, id).then((c) => !off && setCCount(c));
    return () => { off = true; };
  }, [type, id]);

  async function onLike() {
    const signedIn = currentUserId();
    if (!signedIn) { window.location.href = '/register'; return; }
    // optimistic
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    const res = await toggleLike(type, id, { ownerId, entityName });
    if (res === null) { setLiked((v) => !v); setLikes((n) => n + (liked ? 1 : -1)); }
  }

  async function openComments() {
    setOpen((v) => !v);
    if (!open && comments === null) setComments(await getComments(type, id));
  }

  async function submit() {
    if (!currentUserId()) { window.location.href = '/register'; return; }
    if (!text.trim()) return;
    setBusy(true);
    const c = await addComment(type, id, text, { ownerId, entityName });
    setBusy(false);
    if (c) { setComments((prev) => [...(prev ?? []), c]); setCCount((n) => n + 1); setText(''); }
  }

  return (
    <div className="mt-3 border-t border-ember-400/10 pt-2.5">
      <div className="flex items-center gap-4 text-sm">
        <button onClick={gate(onLike)} className={`inline-flex items-center gap-1.5 transition ${liked ? 'text-ember-400' : 'text-smoke-400 hover:text-ember-100'}`}>
          <Heart size={15} strokeWidth={1.5} className={liked ? 'fill-ember-400' : ''} /> {likes > 0 && <span className="tabular">{likes}</span>}
        </button>
        <button onClick={openComments} className="inline-flex items-center gap-1.5 text-smoke-400 transition hover:text-ember-100">
          <MessageCircle size={15} strokeWidth={1.5} /> {cCount > 0 && <span className="tabular">{cCount}</span>}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2.5">
          {comments === null ? (
            <div className="py-2"><Loader2 size={14} className="animate-spin text-ember-400" /></div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="text-sm">
                {c.handle ? (
                  <Link href={`/u/${c.handle}`} className="font-medium text-ember-100 hover:underline">{c.name}</Link>
                ) : (
                  <span className="font-medium text-ember-100">{c.name}</span>
                )}
                <span className="ml-1 text-smoke-200">{c.body}</span>
                <span className="ml-1 text-xs text-smoke-500">· {ago(c.createdAt)}</span>
              </div>
            ))
          )}
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Add a comment…"
              className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-1.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
            />
            <button onClick={gate(submit)} disabled={busy || !text.trim()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ember-400 text-paper hover:bg-ember-600 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
