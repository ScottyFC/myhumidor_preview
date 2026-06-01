'use client';

import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

/** Renders an identifier, but only when the signed-in viewer is a super admin. */
export function AdminOnlyId({ id, label = 'UUID' }: { id: string; label?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => subscribeAuth((s) => setShow(isAdmin(s?.publicId))), []);
  if (!show) return null;
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/20 bg-char/60 px-2.5 py-1 font-mono text-[11px] text-smoke-300">
      <Fingerprint size={12} strokeWidth={1.5} className="text-ember-400" />
      <span className="text-smoke-500">{label}:</span> {id}
    </div>
  );
}
