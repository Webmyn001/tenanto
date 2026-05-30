import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';

export default function BankSelect({ value, onChange, required }) {
  const [banks, setBanks] = useState([]);
  const [filter, setFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    api.get('/verify/banks').then(({ data }) => setBanks(data.banks)).catch(() => {});
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

  const selected = banks.find(b => b.code === value);
  const filtered = filter
    ? banks.filter((b) => b.name.toLowerCase().includes(filter.toLowerCase()))
    : banks;
  const results = filtered.slice(0, 12);

  function select(b) {
    onChange(b.code);
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
      {selected ? (
        <div className="flex items-center gap-2">
          <input className="input flex-1" value={selected.name} readOnly />
          <button type="button" onClick={() => onChange('')} className="btn-outline">Change</button>
        </div>
      ) : (
        <>
          <input
            className="input"
            placeholder="Search banks…"
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
              ) : results.map((b, i) => (
                <li key={b.code}>
                  <button type="button"
                    onClick={() => select(b)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`block w-full px-3 py-2 text-left text-sm ${i === activeIndex ? 'bg-brand-50' : 'hover:bg-brand-50'}`}>
                    {b.name}
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