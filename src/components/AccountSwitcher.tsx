'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Repeat, Store } from 'lucide-react';
import { subscribeAuth, canRetail, setAccountMode, type Session } from '@/lib/auth';

/**
 * Dropdown entry for the account model: a retailer-capable user can switch
 * between their Aficionado (consumer) and Retailer views; a plain consumer is
 * offered a link to set up a retailer account. Renders inside the user menu.
 */
export function AccountSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [retailer, setRetailer] = useState(false);

  useEffect(() => subscribeAuth(setSession), []);
  useEffect(() => {
    if (!session) { setRetailer(false); return; }
    canRetail(session.uuid, session.baseType).then(setRetailer);
  }, [session]);

  if (!session) return null;

  function switchTo(mode: 'consumer' | 'retailer') {
    setAccountMode(mode);
    onNavigate?.();
    router.push(mode === 'retailer' ? '/dashboard' : '/humidor');
  }

  if (retailer) {
    const toRetailer = session.type !== 'retailer';
    return (
      <button
        onClick={() => switchTo(toRetailer ? 'retailer' : 'consumer')}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-smoke-200 transition hover:bg-ember-400/10 hover:text-paper"
      >
        <Repeat size={14} strokeWidth={1.5} className="text-ember-400" />
        {toRetailer ? 'Switch to Retailer' : 'Switch to Aficionado'}
      </button>
    );
  }

  // Plain consumer → offer to set up / link a retailer account.
  return (
    <Link
      href="/verify"
      onClick={onNavigate}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-smoke-200 transition hover:bg-ember-400/10 hover:text-paper"
    >
      <Store size={14} strokeWidth={1.5} className="text-ember-400" />
      Link a retailer account
    </Link>
  );
}
