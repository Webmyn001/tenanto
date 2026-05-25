import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import api, { getUser } from '../../lib/api';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function Avatar({ name, role, size }) {
  const s = size || 10;
  const colors = { student: 'bg-blue-500', corper: 'bg-green-500', landlord: 'bg-violet-500', admin: 'bg-red-500' };
  const bg = colors[role] || 'bg-gray-400';
  return (
    <div className={`${bg} text-white rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ width: s * 4, height: s * 4, fontSize: s * 1.4 }}>
      {initials(name)}
    </div>
  );
}

export default function Conversations() {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  useEffect(() => { setUser(getUser()); }, []);

  useEffect(() => {
    api.get('/chat/conversations').then(({ data }) => {
      setItems(data.items);
      setFiltered(data.items);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(items.filter(c => {
      const other = c.participants?.find(p => p._id !== user?._id);
      const name = other?.fullName?.toLowerCase() || '';
      const title = c.property?.title?.toLowerCase() || '';
      return name.includes(q) || title.includes(q);
    }));
  }, [search, items, user]);

  // Poll for new messages every 10s
  useEffect(() => {
    const id = setInterval(() => {
      api.get('/chat/conversations').then(({ data }) => {
        setItems(data.items);
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setSearch(''); searchRef.current?.blur(); }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Messages</h1>
          <span className="text-sm text-gray-500">{items.length} conversation{items.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input ref={searchRef} placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>

        {filtered.length === 0 ? (
          <div className="card py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">{search ? 'No conversations match your search.' : 'No conversations yet. Start one from a listing.'}</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {filtered.map((c, i) => {
              const other = c.participants?.find(p => p._id !== user?._id);
              const lastMsg = c.lastMessage?.body || '';
              return (
                <Link key={c._id} href={`/chat/${c._id}`}
                  className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-gray-50 active:bg-gray-100 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <Avatar name={other?.fullName} role={other?.role} size={10} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900 truncate">{other?.fullName || 'Unknown'}</p>
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.lastMessage?.createdAt || c.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {c.unread > 0 && <span className="font-semibold text-gray-900">{lastMsg || 'Tap to view'}</span>}
                      {!c.unread && (lastMsg || 'Tap to view')}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.property?.title && <span className="text-[10px] text-gray-400 truncate">about {c.property.title}</span>}
                      {c.unread > 0 && (
                        <span className="ml-auto shrink-0 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center" style={{ minWidth: 18, height: 18, padding: '0 5px' }}>
                          {c.unread > 99 ? '99+' : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
