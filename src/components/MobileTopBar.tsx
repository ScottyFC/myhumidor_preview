'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';

/**
 * Slim native top bar inside the Capacitor app — wordmark + notifications, with
 * a contextual back chevron on detail pages. Hidden on web (`.native-only`).
 * Sits above the status bar via the `native-topbar` safe-area padding.
 */
export function MobileTopBar() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  // Top-level destinations show no back button; everything else does.
  const isRoot = ['/', '/search', '/humidor', '/lounges', '/profile', '/dashboard', '/top', '/map'].includes(pathname);

  return (
    <header className="native-only native-topbar fixed inset-x-0 top-0 z-40 items-center justify-between border-b border-ember-400/15 bg-ink/95 px-3 backdrop-blur-lg">
      <div className="flex h-14 w-full items-center justify-between">
        <div className="flex min-w-0 items-center gap-1">
          {!isRoot && (
            <button
              onClick={() => router.back()}
              aria-label="Back"
              className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-smoke-200 active:bg-ember-400/10"
            >
              <ChevronLeft size={24} strokeWidth={1.75} />
            </button>
          )}
          <Link href="/" aria-label="MyHumidor home" className="flex items-center">
            <img src="/myhumidor-wordmark.png" alt="MyHumidor" className="h-6 w-auto" />
          </Link>
        </div>
        <NotificationBell />
      </div>
    </header>
  );
}
