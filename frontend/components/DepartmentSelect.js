import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';

export default function DepartmentSelect({ value, onChange, required }) {
  const [depts, setDepts] = useState([]);
  const [filter, setFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    api.get('/lookup/departments').then(({ data }) => setDepts(data.departments)).catch(() => {});
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

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const filtered = filter
    ? depts
        .filter((d) => d.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
          const f = filter.toLowerCase();
          const aStarts = a.name.toLowerCase().startsWith(f);
          const bStarts = b.name.toLowerCase().startsWith(f);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.name.localeCompare(b.name);
        })
    : depts;
  const results = filtered.slice(0, 12);

  function select(d) {
    onChange(d.name);
    setFilter('');
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { setIsOpen(true); setActiveIndex(0); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) select(results[activeIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

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
            placeholder="Search department / course…"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            required={required}
          />
          {isOpen && (
            <ul ref={listRef} className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
              ) : results.map((d, i) => (
                <li key={d.name}>
                  <button type="button"
                    onClick={() => select(d)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`block w-full px-3 py-2 text-left text-sm ${i === activeIndex ? 'bg-brand-50' : 'hover:bg-brand-50'}`}>
                    {d.name} <span className="text-xs text-gray-500">· {d.faculty}</span>
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
