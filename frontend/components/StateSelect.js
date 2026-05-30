import { useState, useRef, useEffect } from 'react';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory (FCT)',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function StateSelect({ value, onChange, required }) {
  const [filter, setFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

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
    ? NIGERIAN_STATES
        .filter((s) => s.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
          const f = filter.toLowerCase();
          const aStarts = a.toLowerCase().startsWith(f);
          const bStarts = b.toLowerCase().startsWith(f);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.localeCompare(b);
        })
    : NIGERIAN_STATES;

  function select(state) {
    onChange(state);
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
        setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) select(filtered[activeIndex]);
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
            placeholder="Search state of service…"
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
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
              ) : filtered.map((state, i) => (
                <li key={state}>
                  <button type="button"
                    onClick={() => select(state)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`block w-full px-3 py-2 text-left text-sm ${i === activeIndex ? 'bg-brand-50' : 'hover:bg-brand-50'}`}>
                    {state}
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
