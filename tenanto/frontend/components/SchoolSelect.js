import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function SchoolSelect({ value, onChange, required }) {
  const [schools, setSchools] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/lookup/schools').then(({ data }) => setSchools(data.schools)).catch(() => {});
  }, []);

  const filtered = filter
    ? schools.filter((s) => (s.name + ' ' + s.short).toLowerCase().includes(filter.toLowerCase()))
    : schools;

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-2">
          <input className="input flex-1" value={value} readOnly />
          <button type="button" onClick={() => onChange('')} className="btn-outline">Change</button>
        </div>
      ) : (
        <>
          <input
            className="input"
            placeholder="Search schools…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            required={required}
          />
          {filter && (
            <ul className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
              ) : filtered.slice(0, 12).map((s) => (
                <li key={s.name}>
                  <button type="button"
                    onClick={() => { onChange(s.name); setFilter(''); }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50">
                    {s.name} <span className="text-xs text-gray-500">· {s.short} · {s.state}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
