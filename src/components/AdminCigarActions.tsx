'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { deleteCatalogCigar } from '@/lib/db';

/** Super-admin control to remove a cigar from the catalog. */
export function AdminCigarActions({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeAuth((s) => setShow(isAdmin(s?.publicId))), []);
  if (!show) return null;

  async function remove() {
    setBusy(true);
    const ok = await deleteCatalogCigar(slug);
    setBusy(false);
    if (ok) router.push('/top');
    else setConfirming(false);
  }

  return (
    <div className="mt-4 inline-flex items-center gap-2">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
        >
          <Trash2 size={13} strokeWidth={1.5} /> Remove from database
        </button>
      ) : (
        <>
          <span className="text-xs text-smoke-300">Remove “{name}” permanently?</span>
          <button
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-red-500/80 px-3 py-1.5 text-xs font-medium text-paper hover:bg-red-500 disabled:opacity-60"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={1.5} />}
            Confirm
          </button>
          <button onClick={() => setConfirming(false)} className="text-xs text-smoke-400 hover:text-paper">
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
