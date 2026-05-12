import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import api, { getUser } from '../../lib/api';
import { shortDate } from '../../lib/format';

export default function Conversations() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
    api.get('/chat/conversations').then(({ data }) => setItems(data.items)).catch(() => {});
  }, []);

  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">Messages</h1>
      <div className="card">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No conversations yet. Start one from a listing.</p>
        ) : (
          <ul className="divide-y">
            {items.map((c) => {
              const other = c.participants?.find((p) => p._id !== user?._id);
              return (
                <li key={c._id}>
                  <Link href={`/chat/${c._id}`} className="flex items-center justify-between py-3 hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{c.property?.title || 'Conversation'}</p>
                      <p className="text-xs text-gray-500">with {other?.fullName || '—'} ({other?.role || ''})</p>
                    </div>
                    <span className="text-xs text-gray-500">{shortDate(c.lastMessageAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}
