'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Sparkles, CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react';
import { createPost, deletePost, getPostsForSlug, loungeIdForSlug, KIND_LABEL, type LoungePost, type PostKind } from '@/lib/lounge-posts';
import { cn } from '@/lib/utils';

const KINDS: { id: PostKind; icon: typeof Megaphone }[] = [
  { id: 'deal', icon: Megaphone },
  { id: 'new_arrival', icon: Sparkles },
  { id: 'event', icon: CalendarDays },
];

export function PostComposer({ slug, loungeName }: { slug: string; loungeName?: string }) {
  const [posts, setPosts] = useState<LoungePost[]>([]);
  const [loungeId, setLoungeId] = useState<string | null>(null);
  const [kind, setKind] = useState<PostKind>('deal');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventAt, setEventAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = () => getPostsForSlug(slug).then(setPosts);
  useEffect(() => {
    loungeIdForSlug(slug).then(setLoungeId);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function post() {
    if (!title.trim() || !loungeId) {
      if (!loungeId) setMsg("This lounge isn't in the database yet, so posts can't attach to it.");
      return;
    }
    setBusy(true);
    setMsg('');
    const ok = await createPost({
      loungeId,
      loungeName,
      kind,
      title: title.trim(),
      body: body.trim() || undefined,
      eventAt: kind === 'event' && eventAt ? eventAt : undefined,
    });
    setBusy(false);
    if (ok) {
      setTitle('');
      setBody('');
      setEventAt('');
      refresh();
    } else {
      setMsg("Couldn't post — you need to be a confirmed member of this lounge.");
    }
  }

  async function remove(p: LoungePost) {
    await deletePost(p.id, p.loungeId);
    refresh();
  }

  return (
    <div className="mt-8">
      <div className="eyebrow mb-3">Posts — deals, new arrivals & events</div>

      <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-4">
        <div className="mb-3 flex gap-2">
          {KINDS.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
                  kind === k.id ? 'bg-ember-400 text-paper' : 'border-[0.5px] border-ember-400/20 text-smoke-300 hover:bg-ember-400/10'
                )}
              >
                <Icon size={13} strokeWidth={1.5} /> {KIND_LABEL[k.id]}
              </button>
            );
          })}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === 'deal' ? '20% off Padrón this weekend' : kind === 'new_arrival' ? 'Now carrying Liga Privada T52' : 'Cigar & bourbon pairing night'}
          className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add details (optional)"
          rows={2}
          className="mt-2 w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
        />
        {kind === 'event' && (
          <input
            type="date"
            value={eventAt}
            onChange={(e) => setEventAt(e.target.value)}
            className="mt-2 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper focus:border-ember-400 focus:outline-none"
          />
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={post}
            disabled={!title.trim() || busy}
            className="inline-flex items-center gap-2 rounded-md bg-ember-400 px-4 py-2 text-sm font-medium text-paper hover:bg-ember-600 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={1.5} />}
            Post
          </button>
          {msg && <span className="text-xs text-smoke-400">{msg}</span>}
        </div>
      </div>

      {posts.length > 0 && (
        <div className="mt-4 space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/10 bg-char/40 px-4 py-2.5">
              <div className="min-w-0">
                <span className="eyebrow">{KIND_LABEL[p.kind]}</span>
                <span className="ml-2 text-sm">{p.title}</span>
              </div>
              <button onClick={() => remove(p)} className="shrink-0 text-smoke-400 hover:text-red-300" aria-label="Delete post">
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
