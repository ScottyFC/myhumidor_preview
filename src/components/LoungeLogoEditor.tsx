'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { uploadLoungeLogo } from '@/lib/db';

/**
 * Replace a lounge's profile picture. By default it only renders for super
 * admins; pass `force` (e.g. from the lounge's own dashboard) to always show it.
 */
export function LoungeLogoEditor({
  slug,
  force = false,
  onDone,
}: {
  slug: string;
  force?: boolean;
  onDone?: (url: string) => void;
}) {
  const [show, setShow] = useState(force);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (force) return;
    return subscribeAuth((s) => setShow(isAdmin(s?.publicId)));
  }, [force]);

  if (!show) return null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg('');
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const url = await uploadLoungeLogo(slug, dataUrl);
    setBusy(false);
    if (url) {
      setMsg('Photo updated.');
      onDone?.(url);
    } else {
      setMsg("Couldn't upload — check the avatars storage bucket exists.");
    }
  }

  return (
    <div className="mt-3 inline-flex items-center gap-2">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs font-medium text-ember-100 hover:bg-ember-400/10 disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} strokeWidth={1.5} />}
        Replace photo
      </button>
      {msg && <span className="text-xs text-smoke-400">{msg}</span>}
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </div>
  );
}
