'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, ScanLine, ChevronRight } from 'lucide-react';
import { subscribeAficionado } from '@/lib/aficionado';
import { CigarThumb } from '@/components/CigarThumb';
import { CigarName } from '@/components/CigarName';

interface Candidate { slug: string; brand: string; name: string; image_url: string | null }
type Read = { brand: string; line: string; confidence: string };

/** Camera cigar identifier — reads the band and matches the catalog. Aficionado
 *  members only, and clearly marked Beta. */
export function CigarScanner() {
  const [member, setMember] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [read, setRead] = useState<Read | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [errMsg, setErrMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeAficionado(setMember), []);
  if (!member) return null; // members-only; hidden for everyone else

  async function onFile(file?: File) {
    if (!file) return;
    setState('scanning'); setErrMsg(''); setRead(null); setCandidates([]);
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error('read failed'));
        r.readAsDataURL(file);
      });
      const resp = await fetch('/api/cigar-scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await resp.json();
      if (data.error) {
        setErrMsg(data.error === 'not_configured' ? 'Scanning isn’t available right now.' : 'Couldn’t scan that — try a clearer photo of the band.');
        setState('error'); return;
      }
      setRead(data.read ?? null);
      setCandidates(data.candidates ?? []);
      setState('done');
    } catch {
      setErrMsg('Something went wrong. Try again.');
      setState('error');
    }
  }

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-gradient-to-br from-char/60 to-ink/40 p-5">
      <div className="flex items-center gap-2">
        <ScanLine size={16} className="text-ember-400" />
        <h3 className="font-display text-lg">Scan a cigar</h3>
        <span className="rounded-full border-[0.5px] border-ember-400/40 bg-ember-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ember-200">Beta</span>
      </div>
      <p className="mt-1 text-sm text-smoke-400">Point your camera at the band and we’ll try to identify it. Still learning — results vary with band legibility.</p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={state === 'scanning'}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-60"
      >
        {state === 'scanning' ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} strokeWidth={1.75} />}
        {state === 'scanning' ? 'Reading the band…' : 'Scan a cigar'}
      </button>

      {state === 'error' && <p className="mt-3 text-sm text-smoke-400">{errMsg}</p>}

      {state === 'done' && (
        <div className="mt-4">
          {read && (read.brand || read.line) ? (
            <p className="text-xs text-smoke-400">
              Read: <span className="text-ember-100">{[read.brand, read.line].filter(Boolean).join(' ')}</span>
              <span className="ml-1 text-smoke-500">({read.confidence} confidence)</span>
            </p>
          ) : (
            <p className="text-sm text-smoke-400">Couldn’t read a band in that photo. Try a sharper, well-lit close-up.</p>
          )}

          {candidates.length > 0 && (
            <>
              <p className="mt-2 text-xs text-smoke-500">Closest matches — tap to confirm:</p>
              <ul className="mt-2 divide-y divide-ember-400/10 rounded-lg border-[0.5px] border-ember-400/15">
                {candidates.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/cigars/${c.slug}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-ember-400/5">
                      <CigarThumb slug={c.slug} brand={c.brand} src={c.image_url} className="h-10 w-10 shrink-0 rounded-md" />
                      <span className="min-w-0 flex-1"><CigarName slug={c.slug} brand={c.brand} name={c.name} mode="full" className="block truncate text-sm text-paper" /></span>
                      <ChevronRight size={15} className="shrink-0 text-smoke-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
