import { Lock } from 'lucide-react';
import { LoungeHub } from '@/components/LoungeHub';

export const metadata = { title: 'Dashboard · MyHumidor' };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <div className="mb-6 flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/20 bg-ember-400/5 px-4 py-2 text-xs text-smoke-200">
        <Lock size={12} strokeWidth={1.5} className="text-ember-400" />
        Private to your lounge. Viewership and earnings are visible only to verified owners of this location.
      </div>
      <LoungeHub />
    </div>
  );
}
