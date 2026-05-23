import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';

export default function SchoolSelect({ value, onChange, required }) {
  const [schools, setSchools] = useState([]);
  const [filter, setFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get('/lookup/schools').then(({ data }) => setSchools(data.schools)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = filter
    ? schools
        .filter((s) => (s.name + ' ' + s.short).toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
          const f = filter.toLowerCase();
          const aStarts = a.name.toLowerCase().startsWith(f) || a.short.toLowerCase().startsWith(f);
          const bStarts = b.name.toLowerCase().startsWith(f) || b.short.toLowerCase().startsWith(f);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.name.localeCompare(b.name);
        })
    : schools;

  return (
    <div className="relative" ref={containerRef}>
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
            onChange={(e) => {
              setFilter(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            required={required}
          />
          {isOpen && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
              ) : filtered.slice(0, 12).map((s) => (
                <li key={s.name}>
                  <button type="button"
                    onClick={() => { onChange(s.name); setFilter(''); setIsOpen(false); }}
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
