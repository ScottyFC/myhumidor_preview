'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Link2, MessageCircle, Mail, Check } from 'lucide-react';

/**
 * Share the current page. On mobile/native it opens the OS share sheet
 * (`navigator.share`) — which includes iMessage/Messages on iOS. Elsewhere it
 * shows a small menu with a direct Messages (sms:) link, email, and copy-link.
 */
export function ShareButton({ title, text, label = 'Share' }: { title: string; text?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setUrl(window.location.href); }, []);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const shareText = text || title;

  async function onShare() {
    const link = url || window.location.href;
    // Native share sheet (iMessage, etc.) when available.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title, text: shareText, url: link }); return; }
      catch { /* user cancelled or unsupported — fall through to menu */ }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  const link = url || (typeof window !== 'undefined' ? window.location.href : '');
  const smsHref = `sms:&body=${encodeURIComponent(`${shareText} ${link}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${link}`)}`;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={onShare}
        className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs font-medium text-ember-100 transition hover:bg-ember-400/10"
        aria-label="Share"
      >
        <Share2 size={14} strokeWidth={1.75} /> {label}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border-[0.5px] border-ember-400/20 bg-char py-1 shadow-xl">
          <a href={smsHref} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-smoke-200 hover:bg-ember-400/10">
            <MessageCircle size={15} className="text-ember-300" /> Messages
          </a>
          <a href={mailHref} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-smoke-200 hover:bg-ember-400/10">
            <Mail size={15} className="text-ember-300" /> Email
          </a>
          <button onClick={() => { copy(); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-smoke-200 hover:bg-ember-400/10">
            {copied ? <Check size={15} className="text-ember-300" /> : <Link2 size={15} className="text-ember-300" />} {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
