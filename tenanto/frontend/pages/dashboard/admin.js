import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api, { getUser } from '../../lib/api';
import { naira, shortDate } from '../../lib/format';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('analytics');
  const [data, setData] = useState({});

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(tab); }, [tab]);

  async function load(t) {
    const map = {
      analytics: '/admin/analytics',
      verifications: '/admin/verifications',
      listings: '/admin/listings',
      disputes: '/admin/disputes',
      fraud: '/admin/fraud',
    };
    try { const { data } = await api.get(map[t]); setData(data); } catch {}
  }

  if (!user) return null;
  if (user.role !== 'admin') return <Layout><div className="card text-center">Admins only.</div></Layout>;

  return (
    <Layout wide>
      <h1 className="mb-4 text-2xl font-bold">Admin console</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {['analytics', 'verifications', 'listings', 'disputes', 'fraud'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-1.5 text-sm capitalize ${tab === t ? 'bg-brand-600 text-white' : 'border border-gray-200 bg-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'analytics' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Users', data.users ?? 0],
            ['Listings', data.listings ?? 0],
            ['Active listings', data.activeListings ?? 0],
            ['In escrow', naira(data.escrowedNaira)],
          ].map(([k, v]) => (
            <div key={k} className="card">
              <p className="text-xs text-gray-500">{k}</p>
              <p className="mt-1 text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'verifications' && (
        <section className="card">
          <h2 className="font-semibold">Pending verifications</h2>
          {(data.items || []).length === 0 ? <p className="mt-2 text-sm text-gray-500">Nothing pending.</p> : (
            <ul className="mt-3 divide-y">
              {data.items.map((u) => (
                <li key={u._id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{u.fullName} <span className="badge-gray ml-2 capitalize">{u.role}</span></p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => { await api.post(`/admin/verifications/${u._id}`, { decision: 'reject', notes: 'Documents unclear' }); load('verifications'); }} className="btn-outline">Reject</button>
                      <button onClick={async () => { await api.post(`/admin/verifications/${u._id}`, { decision: 'approve' }); load('verifications'); }} className="btn-primary">Approve</button>
                    </div>
                  </div>
                  {u.documents?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {u.documents.map((d, i) => (
                        <a key={i} href={d.url} target="_blank" className="badge-gray">{d.kind}</a>
                      ))}
                      {u.selfieUrl && <a href={u.selfieUrl} target="_blank" className="badge-gray">selfie</a>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'listings' && (
        <section className="card">
          <h2 className="font-semibold">Listings pending review</h2>
          {(data.items || []).length === 0 ? <p className="mt-2 text-sm text-gray-500">Nothing pending.</p> : (
            <ul className="mt-3 divide-y">
              {data.items.map((p) => (
                <li key={p._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.area} · {naira(p.annualRent)}/yr · by {p.landlord?.fullName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => { await api.post(`/admin/listings/${p._id}`, { decision: 'reject', reason: 'Insufficient detail' }); load('listings'); }} className="btn-outline">Reject</button>
                    <button onClick={async () => { await api.post(`/admin/listings/${p._id}`, { decision: 'approve' }); load('listings'); }} className="btn-primary">Approve</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'disputes' && (
        <section className="card">
          <h2 className="font-semibold">Open disputes</h2>
          {(data.items || []).length === 0 ? <p className="mt-2 text-sm text-gray-500">No disputes.</p> : (
            <ul className="mt-3 divide-y">
              {data.items.map((p) => (
                <li key={p._id} className="py-3">
                  <p className="font-medium">{p.property?.title}</p>
                  <p className="text-xs text-gray-500">Tenant: {p.tenant?.fullName} · Landlord: {p.landlord?.fullName}</p>
                  <p className="mt-1 text-sm italic">"{p.disputeReason}"</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={async () => { await api.post(`/admin/disputes/${p._id}`, { resolution: 'refund' }); load('disputes'); }} className="btn-danger">Refund tenant</button>
                    <button onClick={async () => { await api.post(`/admin/disputes/${p._id}`, { resolution: 'release' }); load('disputes'); }} className="btn-outline">Release to landlord</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'fraud' && (
        <section className="card">
          <h2 className="font-semibold">Bypass attempts (chat)</h2>
          {(data.items || []).length === 0 ? <p className="mt-2 text-sm text-gray-500">No flagged conversations.</p> : (
            <ul className="mt-3 divide-y">
              {data.items.map((c) => (
                <li key={c._id} className="py-3">
                  <p className="font-medium">{c.property?.title}</p>
                  <p className="text-xs text-gray-500">
                    {c.participants?.map((p) => `${p.fullName} (${p.role}, warns:${p.bypassWarnings})`).join(' · ')}
                  </p>
                  <p className="mt-1"><span className="badge-warn">{c.bypassAttempts} blocked attempts</span></p>
                  <div className="mt-2 flex gap-2">
                    {c.participants?.map((p) => (
                      <button key={p._id} onClick={async () => { await api.post(`/admin/users/${p._id}/suspend`, { reason: 'Repeated bypass attempts' }); load('fraud'); }} className="btn-outline text-xs">Suspend {p.fullName.split(' ')[0]}</button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Layout>
  );
}
