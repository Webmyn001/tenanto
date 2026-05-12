import Link from 'next/link';
import { naira } from '../lib/format';

export default function ListingCard({ p }) {
  const cover = p.media?.find((m) => m.type === 'image')?.url;
  return (
    <Link href={`/listings/${p._id}`} className="card group block transition hover:shadow-md">
      <div className="mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
        {cover ? (
          <img src={cover} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="grid h-full w-full place-items-center text-gray-400">No image</div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 font-semibold">{p.title}</h3>
        {p.featured && <span className="badge">Featured</span>}
      </div>
      <p className="mt-1 line-clamp-1 text-sm text-gray-500">{p.area}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-brand-700">{naira(p.annualRent)}<span className="text-xs font-normal text-gray-500">/yr</span></span>
        <span className="text-xs text-gray-500 capitalize">{p.propertyType?.replace('-', ' ')}</span>
      </div>
      {p.installmentEnabled && (
        <p className="mt-1 text-xs text-gray-500">
          From {naira(Math.ceil(p.annualRent / (p.installmentPlan?.months || 6)))}/mo · installments
        </p>
      )}
    </Link>
  );
}
