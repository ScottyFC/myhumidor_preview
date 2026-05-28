import Link from 'next/link';
import { Radio, ArrowRight } from 'lucide-react';
import { LiveStream } from '@/components/LiveStream';

export const metadata = {
  title: 'Live · MyHumidor by CigarTV',
};

const LINEUP = [
  'Behind the Blend',
  'Burn Rate',
  'Cigar Guys',
  'Creekside',
  'Unrolled',
];

export default function LivePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2 flex items-center gap-2">
          <Radio size={13} strokeWidth={1.5} className="text-ember-400" />
          The CigarTV channel
        </div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Live</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          The 24/7 CigarTV linear feed — the same channel streaming in partner lounges
          nationwide. No schedule, no commitment. Pour something and drop in.
        </p>
      </header>

      <LiveStream />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="eyebrow mb-2">On the channel</div>
          <p className="text-smoke-200 leading-relaxed">
            A continuous rotation of every CigarTV series — factory tours, blender
            interviews, lounge visits, and quick reviews. The cigars featured on screen
            link straight into your humidor and the lounges nearby that carry them.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {LINEUP.map((s) => (
              <span
                key={s}
                className="rounded-full border-[0.5px] border-ember-400/20 px-3 py-1 text-xs text-smoke-200"
              >
                {s}
              </span>
            ))}
          </div>
          <Link href="/watch" className="btn-ghost mt-6">
            Browse the full catalog <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </div>

        <aside className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 p-5">
          <div className="eyebrow mb-2">Run a lounge?</div>
          <p className="text-sm text-smoke-200 leading-relaxed">
            This feed plays free on a CigarTV TV stick in your lounge — and earns you
            credits while it runs. Your viewership and earnings stay private to your
            dashboard.
          </p>
          <Link href="/lounges" className="btn-primary mt-4 w-full justify-center">
            The Lounge Program
          </Link>
        </aside>
      </div>
    </div>
  );
}
