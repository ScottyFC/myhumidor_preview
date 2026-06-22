'use client';

import { useState } from 'react';
import { Instagram, Loader2 } from 'lucide-react';
import { safeImg } from '@/lib/img';

/** Share a cigar as a 1080×1920 Instagram Story card. Generates the image
 *  client-side and hands it to the OS share sheet (which offers Instagram →
 *  Stories on mobile); falls back to downloading the image on desktop. */
export function CigarStoryShare({ brand, name, imageUrl }: { brand: string; name: string; imageUrl?: string | null }) {
  const [busy, setBusy] = useState(false);

  async function buildCard(): Promise<Blob | null> {
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background — warm dark gradient (on-brand for a story).
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1c1813'); g.addColorStop(0.55, '#14110d'); g.addColorStop(1, '#0F0A06');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Try to draw the cigar image into a rounded card.
    if (imageUrl) {
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image(); im.crossOrigin = 'anonymous';
          im.onload = () => res(im); im.onerror = () => rej(new Error('img'));
          im.src = safeImg(imageUrl)!;
        });
        const cw = 720, ch = 900, cx = (W - cw) / 2, cy = 360;
        ctx.save();
        ctx.beginPath();
        const r = 36;
        ctx.moveTo(cx + r, cy); ctx.arcTo(cx + cw, cy, cx + cw, cy + ch, r);
        ctx.arcTo(cx + cw, cy + ch, cx, cy + ch, r); ctx.arcTo(cx, cy + ch, cx, cy, r);
        ctx.arcTo(cx, cy, cx + cw, cy, r); ctx.closePath();
        ctx.fillStyle = '#0b0805'; ctx.fill(); ctx.clip();
        // contain
        const ar = img.width / img.height, car = cw / ch;
        let dw = cw, dh = ch, dx = cx, dy = cy;
        if (ar > car) { dh = cw / ar; dy = cy + (ch - dh) / 2; } else { dw = ch * ar; dx = cx + (cw - dw) / 2; }
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      } catch { /* CORS-tainted or failed — text-only card */ }
    }

    // Eyebrow
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0c355';
    ctx.font = '600 34px Georgia, serif';
    ctx.fillText('ON MYHUMIDOR', W / 2, 250);

    // Brand + name
    ctx.fillStyle = '#FAEEDA';
    ctx.font = '500 44px Georgia, serif';
    ctx.fillText(brand.toUpperCase(), W / 2, 1380);
    ctx.font = '700 76px Georgia, serif';
    wrap(ctx, name, W / 2, 1470, 920, 84);

    // Footer wordmark
    ctx.fillStyle = '#f0c355';
    ctx.font = '700 40px Georgia, serif';
    ctx.fillText('MyHumidor', W / 2, 1800);
    ctx.fillStyle = '#888780';
    ctx.font = '400 28px Georgia, serif';
    ctx.fillText('myhumidor.shop', W / 2, 1848);

    return new Promise((res) => canvas.toBlob((b) => res(b), 'image/png'));
  }

  function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
    const words = text.split(' '); let line = ''; const lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await buildCard();
      if (!blob) { setBusy(false); return; }
      const file = new File([blob], 'myhumidor-story.png', { type: 'image/png' });
      const navAny = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (navAny.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: `${brand} ${name}` });
      } else {
        // Desktop fallback: download the card to post manually.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'myhumidor-story.png'; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* cancelled */ }
    setBusy(false);
  }

  return (
    <button onClick={share} disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs font-medium text-ember-100 transition hover:bg-ember-400/10 disabled:opacity-60">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Instagram size={14} strokeWidth={1.75} />} Share as Story
    </button>
  );
}
