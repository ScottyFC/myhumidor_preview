'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { deleteProfileByHandle } from '@/lib/db';

export function RemoveProfileButton({ handle, displayName }: { handle: string; displayName: string }) {
  const [show, setShow] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => subscribeAuth((s) => setShow(isAdmin(s?.publicId))), []);
  if (!show) return null;

  async function remove() {
    setBusy(true);
    const ok = await deleteProfileByHandle(handle);
    setBusy(false);
    if (ok) router.push('/');
    else alert("Couldn't remove this profile — confirm you're signed in as a super admin and that phase11.sql has been run.");
  }

  return (
    <div className="mt-4 rounded-lg border-[0.5px] border-red-500/30 bg-red-500/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-smoke-300">Super-admin tools</div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/10">
            <Trash2 size={13} strokeWidth={1.5} /> Remove profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-smoke-300">Remove {displayName}?</span>
            <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-red-500/80 px-3 py-1.5 text-xs font-medium text-paper hover:bg-red-500 disabled:opacity-60">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} strokeWidth={1.5} />} Confirm
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs text-smoke-400 hover:text-paper">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
