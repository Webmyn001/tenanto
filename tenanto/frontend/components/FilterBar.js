import { useState } from 'react';

export default function FilterBar({ initial = {}, onApply }) {
  const [f, setF] = useState({
    school: initial.school || '',
    state: initial.state || '',
    minPrice: initial.minPrice || '',
    maxPrice: initial.maxPrice || '',
    propertyType: initial.propertyType || '',
    maxDistance: initial.maxDistance || '',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onApply(f); }}
      className="card grid grid-cols-1 gap-3 md:grid-cols-7"
    >
      <div className="md:col-span-2">
        <label className="label">School (for students)</label>
        <input className="input" placeholder="e.g. University of Ibadan" value={f.school} onChange={(e) => set('school', e.target.value)} />
      </div>
      <div>
        <label className="label">State (corpers)</label>
        <input className="input" placeholder="e.g. Oyo" value={f.state} onChange={(e) => set('state', e.target.value)} />
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
        <input type="number" step="0.5" placeholder="e.g. 2" className="input" value={f.maxDistance} onChange={(e) => set('maxDistance', e.target.value)} />
      </div>
      <div className="flex items-end md:col-span-7">
        <button className="btn-primary w-full md:w-auto">Apply filters</button>
      </div>
    </form>
  );
}
