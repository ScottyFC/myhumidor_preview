'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Ticket, ScanLine, Check, History } from 'lucide-react';
import { listLoungePreorders, decidePreorder, confirmPreorder, type LoungePreorder } from '@/lib/preorders';

const HIST = ['fulfilled', 'cancelled', 'declined', 'expired'];
const HIST_LABEL: Record<string, string> = { fulfilled: 'Picked up', cancelled: 'Cancelled', declined: 'Declined', expired: 'Expired' };

export function PreorderManager() {
  const [rows, setRows] = useState<LoungePreorder[] | null>(null);
  const [code, setCode] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const load = useCallback(async () => setRows((await listLoungePreorders()).preorders ?? []), []);
  useEffect(() => { load(); }, [load]);

  async function decide(id: string, decision: 'approved' | 'declined' | 'cancelled', withMessage = false) {
    let message: string | undefined;
    if (withMessage) { const m = window.prompt('Optional message to the member (e.g. why it was cancelled):') ?? ''; message = m.trim() || undefined; }
    await decidePreorder(id, decision, message); load();
  }
  async function confirm(input: { code?: string; token?: string }) {
    setErr(null); setFlash(null);
    const r = await confirmPreorder(input);
    if (!r.ok) { setErr(r.error ?? 'Could not confirm.'); return; }
    setFlash(`Picked up: ${r.cigarName} · ${r.code} (${r.customer})`); setCode(''); load();
  }

  async function scan() {
    setErr(null);
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!BD) { setErr('Live scanning isn’t supported on this device — enter the confirmation code instead.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setScanning(true);
      const video = videoRef.current!; video.srcObject = stream; await video.play();
      const detector = new BD({ formats: ['qr_code'] });
      const tick = async () => {
        if (!videoRef.current) return;
        try { const codes = await detector.detect(video); if (codes[0]) { stream.getTracks().forEach((t) => t.stop()); setScanning(false); confirm({ token: codes[0].rawValue }); return; } } catch { /* keep trying */ }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch { setErr('Camera unavailable — enter the confirmation code instead.'); setScanning(false); }
  }

  const pending = rows?.filter((p) => p.status === 'pending') ?? [];
  const approved = rows?.filter((p) => p.status === 'approved') ?? [];
  const history = rows?.filter((p) => HIST.includes(p.status)) ?? [];

  return (
    <section id="preorders" className="scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Ticket size={18} className="text-ember-400" /> Pre-orders</h2>

      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-paper"><ScanLine size={15} className="text-ember-400" /> Confirm a pickup</div>
        <p className="mt-1 text-xs text-smoke-400">Scan the customer’s QR code, or type their confirmation number.</p>
        {scanning && <video ref={videoRef} className="mt-2 w-full max-w-xs rounded-lg" muted playsInline />}
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PO-XXXXXX" className="w-40 rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 px-3 py-2 text-sm uppercase tracking-wide text-paper focus:border-ember-400/50 focus:outline-none" />
          <button onClick={() => confirm({ code })} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper"><Check size={14} /> Confirm</button>
          <button onClick={scan} className="inline-flex items-center gap-1.5 rounded-lg border-[0.5px] border-ember-400/30 px-4 py-2 text-sm text-ember-100 hover:bg-ember-400/10"><ScanLine size={14} /> Scan QR</button>
        </div>
        {flash && <p className="mt-2 text-sm text-emerald-300">{flash}</p>}
        {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-smoke-500">Awaiting approval ({pending.length})</h3>
          <div className="space-y-2">
            {rows === null && <Loader2 className="animate-spin text-ember-400" />}
            {rows && pending.length === 0 && <p className="text-sm text-smoke-400">Nothing pending.</p>}
            {pending.map((p) => (
              <div key={p.id} className="rounded-lg border-[0.5px] border-ember-400/10 bg-char/40 p-3">
                <div className="font-medium text-paper">{p.cigar_name} {p.quantity > 1 && <span className="text-xs text-smoke-400">×{p.quantity}</span>}</div>
                <div className="text-xs text-smoke-400">{p.profiles?.display_name || p.profiles?.handle || 'Member'} · {new Date(p.created_at).toLocaleDateString()}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => decide(p.id, 'approved')} className="rounded-lg bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper">Approve</button>
                  <button onClick={() => decide(p.id, 'declined', true)} className="rounded-lg border-[0.5px] border-ember-400/20 px-3 py-1.5 text-xs text-smoke-300 hover:text-red-300">Decline…</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-smoke-500">Ready for pickup ({approved.length})</h3>
          <div className="space-y-2">
            {rows && approved.length === 0 && <p className="text-sm text-smoke-400">None waiting.</p>}
            {approved.map((p) => (
              <div key={p.id} className="rounded-lg border-[0.5px] border-ember-400/10 bg-char/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-paper">{p.cigar_name} {p.quantity > 1 && <span className="text-xs text-smoke-400">×{p.quantity}</span>}</div>
                    <div className="text-xs text-smoke-400">{p.profiles?.display_name || p.profiles?.handle || 'Member'}</div>
                  </div>
                  <span className="shrink-0 font-display tracking-wide text-ember-100">{p.confirmation_number}</span>
                </div>
                <button onClick={() => decide(p.id, 'cancelled', true)} className="mt-2 text-xs text-smoke-400 hover:text-red-300">Cancel…</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-5">
          <button onClick={() => setShowHist((v) => !v)} className="flex items-center gap-2 text-sm text-smoke-300 hover:text-paper">
            <History size={14} className="text-ember-400" /> Order history ({history.length})
          </button>
          {showHist && (
            <div className="mt-2 overflow-hidden rounded-lg border-[0.5px] border-ember-400/10">
              {history.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 border-b-[0.5px] border-ember-400/10 bg-char/30 px-3 py-2 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <span className="text-paper">{p.cigar_name}</span>
                    <span className="text-xs text-smoke-400"> · {p.profiles?.display_name || p.profiles?.handle || 'Member'}</span>
                  </div>
                  <span className="shrink-0 text-xs text-smoke-400">{HIST_LABEL[p.status]}{p.status === 'fulfilled' && p.fulfilled_at ? ` ${new Date(p.fulfilled_at).toLocaleDateString()}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
