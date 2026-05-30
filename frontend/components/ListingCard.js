import Link from 'next/link';
import { naira } from '../lib/format';

export default function ListingCard({ p }) {
  const images = p.media?.filter((m) => m.type === 'image') || [];
  const cover = images[0]?.url;
  const auth = p.aiScores?.authenticity;
  const trustTone = auth == null ? 'badge-gray' : auth >= 75 ? 'badge' : auth >= 50 ? 'badge-warn' : 'badge-danger';

  return (
    <Link href={`/listings/${p._id}`} className="card-elevated group block overflow-hidden p-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        {cover ? (
          <img src={cover} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink-400">No image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {p.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
            ★ Featured
          </span>
        )}
        {images.length > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            📷 {images.length}
          </span>
        )}
        {auth != null && (
          <span className={`absolute right-3 top-3 ${trustTone} shadow-md`}>
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
