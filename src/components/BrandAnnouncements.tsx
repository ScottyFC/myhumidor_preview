import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
import { Megaphone, CalendarClock, Rocket } from 'lucide-react';
import { safeImg } from '@/lib/img';

interface Row { id: string; kind: string; title: string; body: string | null; image_url: string | null; link_url: string | null; release_date: string | null; boosted: boolean }

/** Public brand page: banner + the brand's releases/promos/announcements, if this
 *  brand is managed by a brand account (a row exists in `brands`). Renders nothing
 *  otherwise, so it's safe on every brand page. */
export async function BrandAnnouncements({ slug }: { slug: string }) {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = await supabaseServer();
    const { data: brand } = await (sb as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { id: string; banner_url: string | null; description: string | null } | null }> } } } })
      .from('brands').select('id, banner_url, description').eq('slug', slug).maybeSingle();
    if (!brand) return null;
    const { data: posts } = await (sb as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Row[] | null }> } } } } })
      .from('brand_posts').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false }).limit(12);

    const list = posts ?? [];
    if (!brand.banner_url && list.length === 0 && !brand.description) return null;

    return (
      <section className="mb-8">
        {brand.banner_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={safeImg(brand.banner_url)} alt="" className="mb-4 aspect-[16/5] w-full rounded-xl object-cover" />
        )}
        {brand.description && <p className="mb-4 max-w-2xl text-sm text-smoke-200">{brand.description}</p>}
        {list.length > 0 && (
          <>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl tracking-tightest"><Megaphone size={16} className="text-ember-400" /> From the brand</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((p) => {
                const Inner = (
                  <div className="h-full rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-ember-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ember-200">{p.kind}</span>
                      {p.boosted && <span className="inline-flex items-center gap-1 text-[10px] text-ember-300"><Rocket size={10} /> Featured</span>}
                      {p.release_date && <span className="inline-flex items-center gap-1 text-[10px] text-smoke-400"><CalendarClock size={10} /> {p.release_date}</span>}
                    </div>
                    <div className="mt-1.5 text-sm font-medium text-paper">{p.title}</div>
                    {p.body && <p className="mt-1 text-xs text-smoke-300">{p.body}</p>}
                  </div>
                );
                return p.link_url
                  ? <a key={p.id} href={p.link_url} target="_blank" rel="noreferrer" className="block transition hover:opacity-90">{Inner}</a>
                  : <div key={p.id}>{Inner}</div>;
              })}
            </div>
          </>
        )}
      </section>
    );
  } catch {
    return null;
  }
}
