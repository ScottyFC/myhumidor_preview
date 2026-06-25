'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Ticket, Clock, CheckCircle2 } from 'lucide-react';
import { listMyPreorders } from '@/lib/preorders';

const MAP: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  pending: { label: 'Pre-ordered · awaiting approval', cls: 'border-ember-400/30 bg-ember-400/10 text-ember-300', Icon: Clock },
  approved: { label: 'Pre-order confirmed · ready for pickup', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', Icon: CheckCircle2 },
  fulfilled: { label: 'Pre-order picked up', cls: 'border-smoke-500/30 bg-smoke-500/10 text-smoke-300', Icon: CheckCircle2 },
};

/** Shows the viewer's pre-order status for this cigar, if they have one. */
export function PreorderStatusTag({ slug }: { slug: string }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    listMyPreorders().then((r) => {
      if (off) return;
      const active = (r.preorders ?? []).filter((p) => p.slug === slug && ['pending', 'approved', 'fulfilled'].includes(p.status));
      // prefer the most actionable status
      const pick = active.find((p) => p.status === 'approved') ?? active.find((p) => p.status === 'pending') ?? active[0];
      setStatus(pick?.status ?? null);
    }).catch(() => {});
    return () => { off = true; };
  }, [slug]);

  if (!status || !MAP[status]) return null;
  const m = MAP[status];
  return (
    <Link href="/preorders" className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${m.cls}`}>
      <m.Icon size={13} /> {m.label}
      <Ticket size={12} className="opacity-70" />
    </Link>
  );
}
