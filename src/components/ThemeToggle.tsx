'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/** Light/Dark theme switch. Default is light; choice persists in localStorage and
 *  is applied before paint by the inline script in the layout. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function set(toDark: boolean) {
    setDark(toDark);
    document.documentElement.classList.toggle('dark', toDark);
    try { localStorage.setItem('mh-theme', toDark ? 'dark' : 'light'); } catch { /* ignore */ }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border-[0.5px] border-ember-400/20 bg-char/40 p-1">
      <button
        onClick={() => set(false)}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition ${!dark ? 'bg-ember-400 font-medium text-paper' : 'text-smoke-300 hover:text-paper'}`}
      >
        <Sun size={15} strokeWidth={1.75} /> Light
      </button>
      <button
        onClick={() => set(true)}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition ${dark ? 'bg-ember-400 font-medium text-paper' : 'text-smoke-300 hover:text-paper'}`}
      >
        <Moon size={15} strokeWidth={1.75} /> Dark
      </button>
    </div>
  );
}
