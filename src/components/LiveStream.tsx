'use client';

import { useEffect, useRef, useState } from 'react';
import { Radio, Volume2, VolumeX } from 'lucide-react';

const DEFAULT_STREAM =
  'https://amg30862-amg30862c1-amgplt0065.playout.now3.amagi.tv/ts-us-e2-n2/playlist/amg30862-amg30862c1-amgplt0065/playlist.m3u8';

export function LiveStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading');
  const [muted, setMuted] = useState(true);

  const url = process.env.NEXT_PUBLIC_LIVE_STREAM_URL || DEFAULT_STREAM;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: any;

    async function setup() {
      if (!video) return;
      // Safari / iOS play HLS natively
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadeddata', () => setStatus('live'));
        video.addEventListener('error', () => setStatus('error'));
        return;
      }
      // Everyone else: hls.js
      try {
        const Hls = (await import('hls.js')).default;
        if (Hls.isSupported()) {
          hls = new Hls({ lowLatencyMode: true, enableWorker: true });
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setStatus('live');
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_e: unknown, data: any) => {
            if (data?.fatal) setStatus('error');
          });
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }

    setup();
    return () => hls?.destroy();
  }, [url]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black ring-1 ring-ember-400/10">
      <video
        ref={videoRef}
        muted={muted}
        autoPlay
        playsInline
        controls
        className="aspect-video w-full"
      />

      {/* Channel mark */}
      <div className="pointer-events-none absolute left-4 top-4 text-[11px] font-medium tracking-widest text-paper/85">
        <span className="text-ember-400">CIGAR</span>TV
      </div>

      {/* Live badge */}
      <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded bg-char/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-paper">
        {status === 'live' ? (
          <>
            <span className="inline-block h-1.5 w-1.5 animate-ember-pulse rounded-full bg-red-500" />
            On Air
          </>
        ) : status === 'loading' ? (
          <>
            <Radio size={11} strokeWidth={1.5} className="text-ember-400" /> Connecting…
          </>
        ) : (
          <span className="text-smoke-200">Offline</span>
        )}
      </div>

      {/* Mute toggle */}
      <button
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          v.muted = !v.muted;
          setMuted(v.muted);
        }}
        className="absolute bottom-16 right-4 z-10 rounded-full bg-char/70 p-2 text-paper transition hover:bg-char"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={16} strokeWidth={1.5} /> : <Volume2 size={16} strokeWidth={1.5} />}
      </button>

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-leather-deep px-8 text-center">
          <div>
            <Radio className="mx-auto mb-3 text-ember-400" size={28} strokeWidth={1.5} />
            <div className="font-display text-lg">Stream unavailable</div>
            <div className="mt-1 text-sm text-smoke-400">
              The live channel isn&apos;t responding. Check NEXT_PUBLIC_LIVE_STREAM_URL.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
