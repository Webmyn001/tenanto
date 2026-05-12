import { useState } from 'react';

export default function FilterBar({ initial = {}, onApply }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    school: initial.school || '',
    state: initial.state || '',
    minPrice: initial.minPrice || '',
    maxPrice: initial.maxPrice || '',
    propertyType: initial.propertyType || '',
    maxDistance: initial.maxDistance || '',
    verifiedOnly: initial.verifiedOnly === 'true',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  function apply(e) {
    e?.preventDefault();
    onApply({ ...f, verifiedOnly: f.verifiedOnly ? 'true' : '' });
    setOpen(false);
  }

  return (
    <div className="card p-4 sm:p-5">
      {/* Toggle on mobile */}
      <div className="flex items-center justify-between md:hidden">
        <p className="font-display text-base font-bold">Filters</p>
        <button onClick={() => setOpen(!open)} className="btn-ghost text-sm">
          {open ? 'Hide ↑' : 'Show ↓'}
        </button>
      </div>

      <form
        onSubmit={apply}
        className={`${open ? 'block' : 'hidden'} mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-0 md:grid md:grid-cols-7 md:gap-3 lg:grid-cols-8`}
      >
        <div className="sm:col-span-2 md:col-span-2">
          <label className="label">School (students)</label>
          <input className="input" placeholder="University of Ibadan" value={f.school} onChange={(e) => set('school', e.target.value)} />
        </div>
        <div>
          <label className="label">State (corpers)</label>
          <input className="input" placeholder="Oyo" value={f.state} onChange={(e) => set('state', e.target.value)} />
        </div>
        <div>
          <label className="label">Min ₦</label>
          <input type="number" className="input" value={f.minPrice} onChange={(e) => set('minPrice', e.target.value)} />
        </div>
        <div>
          <label className="label">Max ₦</label>
          <input type="number" className="input" value={f.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={f.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
            <option value="">Any</option>
            <option value="self-contain">Self-contain</option>
            <option value="one-bedroom">1-bedroom</option>
            <option value="two-bedroom">2-bedroom</option>
            <option value="three-bedroom">3-bedroom</option>
            <option value="shared-room">Shared</option>
            <option value="hostel">Hostel</option>
          </select>
        </div>
        <div>
          <label className="label">Max km</label>
          <input type="number" step="0.5" className="input" placeholder="2" value={f.maxDistance} onChange={(e) => set('maxDistance', e.target.value)} />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 md:col-span-7 lg:col-span-8 lg:justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={f.verifiedOnly} onChange={(e) => set('verifiedOnly', e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            Verified landlords only
          </label>
          <button className="btn-primary">Apply filters</button>
        </div>
      </form>
    </div>
  );
}
