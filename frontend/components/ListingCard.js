import Link from 'next/link';
import { naira } from '../lib/format';

export default function ListingCard({ p }) {
  const cover = p.media?.find((m) => m.type === 'image')?.url;
  const auth = p.aiScores?.authenticity;
  const trustTone = auth == null ? 'badge-gray' : auth >= 75 ? 'badge' : auth >= 50 ? 'badge-warn' : 'badge-danger';

  return (
    <Link href={`/listings/${p._id}`} className="card-elevated group block overflow-hidden p-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        {cover ? (
          <img src={cover} alt={p.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink-400">No image</div>
        )}
        {p.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-bold text-white shadow-soft">
            ★ Featured
          </span>
        )}
        {auth != null && (
          <span className={`absolute right-3 top-3 ${trustTone} backdrop-blur`}>
            Trust {auth}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display font-bold text-ink-900">{p.title}</h3>
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">📍 {p.area}</p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xl font-extrabold text-brand-700">
              {naira(p.annualRent)}<span className="text-sm font-normal text-ink-500">/yr</span>
            </p>
            {p.installmentEnabled && (
              <p className="text-xs text-ink-500">
                or {naira(Math.ceil(p.annualRent / (p.installmentPlan?.months || 6)))}/mo
              </p>
            )}
          </div>
          <span className="text-xs capitalize text-ink-500">{p.propertyType?.replace('-', ' ')}</span>
        </div>
      </div>
    </Link>
  );
}
