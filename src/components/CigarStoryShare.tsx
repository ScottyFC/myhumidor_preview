'use client';

import { useEffect, useState } from 'react';
import { Instagram, Loader2 } from 'lucide-react';
import { safeImg } from '@/lib/img';
import { getSession } from '@/lib/auth';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';

const SITE = 'https://www.myhumidor.shop';

/** Share a cigar as a 1080x1920 Instagram Story card: the sharer's handle up top,
 *  the cigar (or brand) image in the middle, and the MyHumidor logo + a link to the
 *  cigar page at the bottom. Generated client-side and handed to the OS share sheet. */
export function CigarStoryShare({ slug, brand, name, imageUrl }: { slug: string; brand: string; name: string; imageUrl?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState<string>('');

  useEffect(() => {
    const s = getSession();
    if (s?.displayName) setHandle(s.displayName);
    if (isSupabaseConfigured && s?.uuid) {
      (async () => {
        try {
          const { data } = await supabaseBrowser().from('profiles').select('handle').eq('id', s.uuid).single();
          if (data?.handle) setHandle(`@${data.handle}`);
        } catch { /* keep displayName */ }
      })();
    }
  }, []);

  function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('img'));
      im.src = src;
    });
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function initials(): string {
    const w = `${brand} ${name}`.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '\u2022';
    return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
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

  async function buildCard(): Promise<Blob | null> {
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1c1813'); g.addColorStop(0.55, '#14110d'); g.addColorStop(1, '#0F0A06');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Top: sharer handle
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0c355';
    ctx.font = '600 38px Georgia, serif';
    ctx.fillText((handle || 'On MyHumidor').toUpperCase(), W / 2, 250);

    // Middle: cigar image (or brand monogram fallback)
    const cx = 180, cy = 360, cw = 720, ch = 860;
    ctx.save();
    roundRect(ctx, cx, cy, cw, ch, 36);
    ctx.fillStyle = '#0b0805'; ctx.fill(); ctx.clip();
    let drew = false;
    if (imageUrl) {
      try {
        const img = await loadImg(safeImg(imageUrl)!);
        const ar = img.width / img.height, car = cw / ch;
        let dw = cw, dh = ch, dx = cx, dy = cy;
        if (ar > car) { dh = cw / ar; dy = cy + (ch - dh) / 2; } else { dw = ch * ar; dx = cx + (cw - dw) / 2; }
        ctx.drawImage(img, dx, dy, dw, dh);
        drew = true;
      } catch { /* monogram */ }
    }
    if (!drew) {
      const mg = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
      mg.addColorStop(0, 'rgba(240,195,85,0.16)'); mg.addColorStop(1, 'rgba(11,8,5,0)');
      ctx.fillStyle = mg; ctx.fillRect(cx, cy, cw, ch);
      ctx.fillStyle = 'rgba(240,195,85,0.85)';
      ctx.font = '600 220px Georgia, serif';
      ctx.fillText(initials(), cx + cw / 2, cy + ch / 2 + 78);
    }
    ctx.restore();

    // Brand + name
    ctx.fillStyle = '#FAEEDA';
    ctx.font = '500 44px Georgia, serif';
    ctx.fillText(brand.toUpperCase(), W / 2, 1340);
    ctx.font = '700 78px Georgia, serif';
    wrap(ctx, name, W / 2, 1432, 920, 86);

    // Bottom: logo + cigar link
    try {
      const logo = await loadImg('/myhumidor-logo.png');
      const lw = 300, lh = Math.round((logo.height / logo.width) * lw);
      ctx.drawImage(logo, (W - lw) / 2, 1620, lw, lh);
    } catch {
      ctx.fillStyle = '#f0c355';
      ctx.font = '700 44px Georgia, serif';
      ctx.fillText('MyHumidor', W / 2, 1720);
    }
    ctx.fillStyle = '#9a948a';
    ctx.font = '400 30px Georgia, serif';
    ctx.fillText(`myhumidor.shop/cigars/${slug}`, W / 2, 1850);

    return new Promise((res) => canvas.toBlob((b) => res(b), 'image/png'));
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await buildCard();
      if (!blob) { setBusy(false); return; }
      const file = new File([blob], 'myhumidor-story.png', { type: 'image/png' });
      const url = `${SITE}/cigars/${slug}`;
      const navAny = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (navAny.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: `${brand} ${name}`, text: `${brand} ${name} on MyHumidor`, url });
      } else {
        const dl = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = dl; a.download = 'myhumidor-story.png'; a.click();
        URL.revokeObjectURL(dl);
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
