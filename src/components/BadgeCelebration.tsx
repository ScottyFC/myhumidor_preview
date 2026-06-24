'use client';
import { useEffect, useRef } from 'react';
import { BadgeMedal } from '@/components/BadgeMedal';
import type { BadgeDef } from '@/lib/badges';

const COLORS = ['#f0c355', '#ffd98f', '#8fd3ff', '#ff9ff0', '#9dffc9', '#ffffff', '#e0b14a'];

/** Lightweight canvas confetti — no dependencies, cleans itself up. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => { w = canvas.width = Math.floor(innerWidth * dpr); h = canvas.height = Math.floor(innerHeight * dpr); canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; };
    resize(); window.addEventListener('resize', resize);

    type P = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; shape: number };
    const parts: P[] = [];
    const spawn = (cx: number) => { for (let i = 0; i < 70; i++) parts.push({ x: cx, y: h * 0.28, vx: (Math.random() - 0.5) * 16 * dpr, vy: (Math.random() * -10 - 6) * dpr, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, size: (Math.random() * 6 + 4) * dpr, color: COLORS[(Math.random() * COLORS.length) | 0], shape: Math.random() < 0.5 ? 0 : 1 }); };
    spawn(w * 0.5); setTimeout(() => spawn(w * 0.25), 180); setTimeout(() => spawn(w * 0.75), 320);

    const gravity = 0.32 * dpr; let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const age = now - start;
      for (const p of parts) {
        p.vy += gravity; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        const fade = age > 1800 ? Math.max(0, 1 - (age - 1800) / 1400) : 1;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (age < 3400) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60]" />;
}

export function BadgeCelebration({ badges, onClose }: { badges: BadgeDef[]; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  if (badges.length === 0) return null;
  const many = badges.length > 1;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/75 px-6 backdrop-blur-sm" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={onClose} role="dialog" aria-modal="true">
      <Confetti />
      <div className="relative z-[58] w-full max-w-sm rounded-2xl border-[0.5px] border-ember-400/30 bg-gradient-to-b from-[#1a150e] to-[#0b0805] p-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow mb-1 text-ember-300">{many ? `${badges.length} badges earned` : 'Badge earned'}</div>
        <h2 className="font-display text-3xl tracking-tightest text-paper">Nice work!</h2>
        <div className={`mt-5 flex flex-wrap items-start justify-center ${many ? 'gap-4' : ''}`}>
          {badges.slice(0, 3).map((b) => (
            <div key={b.id} className="animate-[badgePop_0.5s_cubic-bezier(0.34,1.56,0.64,1)]">
              <BadgeMedal badge={b} earned size={many ? 96 : 132} />
            </div>
          ))}
        </div>
        {badges.length > 3 && <p className="mt-2 text-xs text-smoke-400">…and {badges.length - 3} more</p>}
        <button onClick={onClose} className="mt-6 w-full rounded-xl bg-ember-400 py-3 text-sm font-medium text-paper transition hover:brightness-110">Collect</button>
      </div>
    </div>
  );
}
