'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, ScanLine, X, ChevronRight, RotateCcw } from 'lucide-react';
import { subscribeAficionado } from '@/lib/aficionado';
import { CigarThumb } from '@/components/CigarThumb';
import { CigarName } from '@/components/CigarName';

interface Candidate { slug: string; brand: string; name: string; image_url: string | null; band_image_url: string | null }
type Read = { brand: string; line: string; confidence: string };
type State = 'idle' | 'camera' | 'scanning' | 'result' | 'error';

/**
 * In-app cigar scanner. On the native app it uses the official Capacitor camera
 * (reliable — the WKWebView's getUserMedia is flaky and errors with Fig -12710);
 * on the web it shows a live in-app camera preview with a shutter. Either way the
 * matched cigar is overlaid with a link to its page. Aficionado-only, Beta.
 */
export function CigarScanner() {
  const [member, setMember] = useState<boolean | null>(null);
  const [state, setState] = useState<State>('idle');
  const [read, setRead] = useState<Read | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [errMsg, setErrMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeAficionado(setMember), []);
  useEffect(() => () => stopStream(), []);

  // Attach the live stream once the <video> is actually mounted (state === 'camera').
  // Doing this in an effect (not a setTimeout) avoids the race where the ref isn't
  // ready yet, which left the preview black.
  useEffect(() => {
    if (state !== 'camera') return;
    const v = videoRef.current;
    const s = streamRef.current;
    if (!v || !s) return;
    v.srcObject = s;
    const t = setTimeout(() => v.play().catch(() => {}), 0);
    return () => clearTimeout(t);
  }, [state]);

  if (!member) return null; // members-only; hidden for everyone else

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function scan(dataUrl: string) {
    setState('scanning'); setErrMsg('');
    try {
      const resp = await fetch('/api/cigar-scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await resp.json();
      if (data.error) {
        setErrMsg(data.error === 'not_configured' ? 'Scanning isn’t available right now.' : 'Couldn’t scan that — try a clearer shot of the band.');
        setState('error'); return;
      }
      setRead(data.read ?? null);
      setCandidates(data.candidates ?? []);
      setState('result');
    } catch {
      setErrMsg('Something went wrong. Try again.');
      setState('error');
    }
  }

  // Live in-app camera preview via getUserMedia, rendered into a normal <video>
  // element — works the same in the web app and inside the iOS/Android webview
  // (needs only the camera permission string, no behind-the-webview transparency).
  // If the camera can't be opened, we fall back to the OS photo/camera picker.
  async function openCamera() {
    setErrMsg(''); setRead(null); setCandidates([]);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch {
        // Retry with a plain video constraint (some devices reject facingMode).
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setState('camera'); // effect attaches the stream once the <video> mounts
    } catch {
      fileRef.current?.click(); // fall back to the OS photo/camera picker
    }
  }

  function openScanner() {
    setRead(null); setCandidates([]); setErrMsg('');
    openCamera();
  }

  function close() { stopStream(); setState('idle'); }

  function captureWeb() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    v.pause();
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    scan(canvas.toDataURL('image/jpeg', 0.8));
  }

  function scanAgain() {
    setRead(null); setCandidates([]); setErrMsg('');
    openCamera();
  }

  async function onFile(file?: File) {
    if (!file) return;
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string); r.onerror = () => rej(new Error('read failed'));
      r.readAsDataURL(file);
    });
    setState('scanning');
    scan(dataUrl);
  }

  const top = candidates[0];
  const rest = candidates.slice(1, 4);

  return (
    <>
      {/* Launcher card */}
      <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-gradient-to-br from-char/60 to-ink/40 p-5">
        <div className="flex items-center gap-2">
          <ScanLine size={16} className="text-ember-400" />
          <h3 className="font-display text-lg">Scan a cigar</h3>
          <span className="rounded-full border-[0.5px] border-ember-400/40 bg-ember-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ember-200">Beta</span>
        </div>
        <p className="mt-1 text-sm text-smoke-400">Point your camera at the band and we’ll identify it. Still learning — results vary with band legibility.</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={openScanner} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600">
          <Camera size={14} strokeWidth={1.75} /> Scan a cigar
        </button>
        <button onClick={() => fileRef.current?.click()} className="ml-3 text-xs text-ember-200 underline underline-offset-2">
          or choose a photo
        </button>
      </div>

      {/* Overlay: web live camera, or (native/file) the scanning + result surface */}
      {state !== 'idle' && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          {<video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />}

          <div className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-paper backdrop-blur">
              <ScanLine size={13} className="text-ember-400" /> Scan <span className="text-[10px] uppercase tracking-wide text-ember-200">Beta</span>
            </span>
            <button onClick={close} aria-label="Close" className="rounded-full bg-black/50 p-2 text-paper backdrop-blur"><X size={18} /></button>
          </div>

          {state === 'camera' && (
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
              <div className="h-44 w-72 rounded-2xl border-2 border-ember-400/70 shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)]" />
              <p className="mt-4 rounded-full bg-black/50 px-3 py-1 text-xs text-paper backdrop-blur">Center the band, then tap to scan</p>
            </div>
          )}

          {state === 'scanning' && (
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 text-paper">
              <Loader2 size={28} className="animate-spin text-ember-400" />
              <p className="rounded-full bg-black/50 px-3 py-1 text-xs backdrop-blur">Reading the band…</p>
            </div>
          )}

          <div className="relative z-10 mt-auto px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            {state === 'camera' && (
              <div className="flex justify-center">
                <button onClick={captureWeb} aria-label="Capture" className="h-16 w-16 rounded-full border-4 border-white/80 bg-white/20 backdrop-blur active:scale-95" />
              </div>
            )}

            {state === 'error' && (
              <div className="rounded-2xl bg-char/90 p-4 text-center backdrop-blur">
                <p className="text-sm text-smoke-200">{errMsg}</p>
                <button onClick={scanAgain} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper"><RotateCcw size={13} /> Try again</button>
              </div>
            )}

            {state === 'result' && (
              <div className="rounded-2xl border-[0.5px] border-ember-400/25 bg-char/90 p-3 backdrop-blur">
                {top ? (
                  <>
                    <p className="px-1 pb-2 text-[11px] text-smoke-400">
                      {read && (read.brand || read.line)
                        ? <>Found: <span className="text-ember-100">{[read.brand, read.line].filter(Boolean).join(' ')}</span></>
                        : 'Closest match'}
                    </p>
                    <Link href={`/cigars/${top.slug}`} onClick={close} className="flex items-center gap-3 rounded-xl bg-ember-400/10 p-2.5 active:bg-ember-400/20">
                      <CigarThumb slug={top.slug} brand={top.brand} src={top.band_image_url ?? top.image_url} className="h-12 w-12 shrink-0 rounded-md" />
                      <span className="min-w-0 flex-1">
                        <CigarName slug={top.slug} brand={top.brand} name={top.name} mode="full" className="block truncate text-sm font-medium text-paper" />
                        <span className="text-[11px] text-ember-200">View cigar</span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-ember-300" />
                    </Link>

                    {rest.length > 0 && (
                      <ul className="mt-1.5 divide-y divide-ember-400/10">
                        {rest.map((c) => (
                          <li key={c.slug}>
                            <Link href={`/cigars/${c.slug}`} onClick={close} className="flex items-center gap-3 px-2 py-2 active:bg-ember-400/5">
                              <CigarThumb slug={c.slug} brand={c.brand} src={c.band_image_url ?? c.image_url} className="h-8 w-8 shrink-0 rounded" />
                              <CigarName slug={c.slug} brand={c.brand} name={c.name} mode="full" className="min-w-0 flex-1 truncate text-xs text-smoke-200" />
                              <ChevronRight size={14} className="shrink-0 text-smoke-500" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="px-1 py-2 text-center text-sm text-smoke-300">No match found. Try a sharper, well-lit shot of the band.</p>
                )}
                <button onClick={scanAgain} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 py-2 text-xs font-medium text-ember-100">
                  <RotateCcw size={13} /> Scan again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
