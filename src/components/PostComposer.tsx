'use client';

import { useEffect, useRef, useState } from 'react';
import { Megaphone, Sparkles, CalendarDays, Store, Loader2, Plus, Trash2, ImagePlus, Rocket, X } from 'lucide-react';
import { createPost, deletePost, getPostsForSlug, loungeIdForSlug, KIND_LABEL, type LoungePost, type PostKind } from '@/lib/lounge-posts';
import { cn } from '@/lib/utils';

const KINDS: { id: PostKind; icon: typeof Megaphone }[] = [
  { id: 'new_arrival', icon: Sparkles },
  { id: 'deal', icon: Megaphone },
  { id: 'event', icon: CalendarDays },
  { id: 'update', icon: Store },
];

const BOOST_COST = 50; // credits to promote a post for 7 days

export function PostComposer({ slug, loungeName }: { slug: string; loungeName?: string }) {
  const [posts, setPosts] = useState<LoungePost[]>([]);
  const [loungeId, setLoungeId] = useState<string | null>(null);
  const [kind, setKind] = useState<PostKind>('new_arrival');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventAt, setEventAt] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [boost, setBoost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => getPostsForSlug(slug).then(setPosts);
  useEffect(() => {
    loungeIdForSlug(slug).then(setLoungeId);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function post() {
    if (!title.trim() || !loungeId) {
      if (!loungeId) setMsg("This lounge isn't in the database yet, so posts can't attach to it.");
      return;
    }
    setBusy(true);
    setMsg('');
    const res = await createPost({
      loungeId,
      loungeName,
      loungeSlug: slug,
      kind,
      title: title.trim(),
      body: body.trim() || undefined,
      eventAt: kind === 'event' && eventAt ? eventAt : undefined,
      photoDataUrl: photo,
      boostCredits: boost ? BOOST_COST : undefined,
    });
    setBusy(false);
    if (res.ok) {
      setTitle(''); setBody(''); setEventAt(''); setPhoto(undefined); setBoost(false);
      refresh();
    } else {
      setMsg(res.error || "Couldn't post — you need to be a confirmed member of this lounge.");
    }
  }

  async function remove(p: LoungePost) {
    await deletePost(p.id, p.loungeId);
    refresh();
  }

  const placeholder =
    kind === 'deal' ? '20% off Padrón this weekend'
    : kind === 'new_arrival' ? 'Now carrying Liga Privada T52'
    : kind === 'event' ? 'Cigar & bourbon pairing night'
    : "We've extended our weekend hours";

  return (
    <div className="mt-8">
      <div className="eyebrow mb-3">Post to your lounge</div>

      <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
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
          placeholder={placeholder}
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

        {/* Photo */}
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
        {photo ? (
          <div className="mt-3 relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="post" className="max-h-40 rounded-lg object-cover" />
            <button onClick={() => setPhoto(undefined)} className="absolute -right-2 -top-2 rounded-full bg-char p-1 text-smoke-300 hover:text-red-400" aria-label="Remove photo">
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="btn-ghost mt-3 text-xs">
            <ImagePlus size={14} strokeWidth={1.5} /> Add photo
          </button>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ember-400/10 pt-3">
          <button
            onClick={() => setBoost((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
              boost ? 'bg-ember-400/20 text-ember-100 ring-1 ring-ember-400/40' : 'border-[0.5px] border-ember-400/20 text-smoke-300 hover:bg-ember-400/10'
            )}
          >
            <Rocket size={13} strokeWidth={1.5} /> Boost for 7 days · {BOOST_COST} credits
          </button>
          <button
            onClick={post}
            disabled={!title.trim() || busy}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-ember-400 px-4 py-2 text-sm font-medium text-paper hover:bg-ember-600 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={1.5} />}
            {boost ? 'Boost & post' : 'Post'}
          </button>
        </div>
        {msg && <p className="mt-2 text-xs text-smoke-400">{msg}</p>}
      </div>

      {posts.length > 0 && (
        <div className="mt-4 space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/10 bg-char/40 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="eyebrow">{KIND_LABEL[p.kind]}</span>
                {p.promoted && <span className="rounded-full bg-ember-400/20 px-1.5 py-0.5 text-[10px] text-ember-100">Boosted</span>}
                <span className="truncate text-sm">{p.title}</span>
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
