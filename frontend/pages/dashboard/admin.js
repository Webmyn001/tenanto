import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api, { getUser } from '../../lib/api';
import { naira, shortDate } from '../../lib/format';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('analytics');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewProperty, setViewProperty] = useState(null);

  useEffect(() => { setUser(getUser()); }, []);

  useEffect(() => {
    setLoading(true);
    load(tab).finally(() => setLoading(false));
  }, [tab]);

  async function load(t) {
    const map = {
      analytics: '/admin/analytics',
      verifications: '/admin/verifications',
      listings: '/admin/listings',
      disputes: '/admin/disputes',
      fraud: '/admin/fraud',
    };
    const { data: res } = await api.get(map[t]);
    setData(res);
  }

  if (!user) return <Layout><div className="flex min-h-[50vh] items-center justify-center"><span className="spinner h-8 w-8 text-brand-600" /></div></Layout>;
  if (user.role !== 'admin') return <Layout><div className="card text-center">Admins only.</div></Layout>;

  return (
    <Layout wide>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin console</h1>
        <p className="text-sm text-gray-500">Manage users, listings, and platform activity.</p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 scrollbar-none">
        {['analytics', 'verifications', 'listings', 'disputes', 'fraud'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium capitalize transition sm:flex-1 sm:px-4 ${tab === t ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><span className="spinner h-8 w-8 text-brand-600" /></div>
      ) : tab === 'analytics' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={data.users ?? 0} icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" color="bg-violet-500" />
          <StatCard label="Total listings" value={data.listings ?? 0} icon="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" color="bg-blue-500" />
          <StatCard label="Active listings" value={data.activeListings ?? 0} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-green-500" />
          <StatCard label="In escrow" value={naira(data.escrowedNaira)} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-amber-500" />
        </div>
      )}

      {tab === 'verifications' && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Pending verifications</h2>
          {(data.items || []).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <p className="font-medium text-gray-700">Nothing pending</p>
              <p className="mt-1 text-sm text-gray-500">All verifications have been reviewed.</p>
            </div>
          ) : (
            <div className="-m-5 divide-y">
              {data.items.map((u) => (
                  <div key={u._id} className="px-5 py-4 transition hover:bg-gray-50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{u.fullName} <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${u.role === 'student' ? 'bg-blue-50 text-blue-700' : u.role === 'corper' ? 'bg-green-50 text-green-700' : 'bg-violet-50 text-violet-700'}`}>{u.role}</span></p>
                        <p className="mt-0.5 text-sm text-gray-500">{u.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => { await api.post(`/admin/verifications/${u._id}`, { decision: 'reject', notes: 'Documents unclear' }); load('verifications'); }} className="btn-outline px-3 py-1.5 text-xs">Reject</button>
                        <button onClick={async () => { await api.post(`/admin/verifications/${u._id}`, { decision: 'approve' }); load('verifications'); }} className="btn-primary px-3 py-1.5 text-xs">Approve</button>
                      </div>
                    </div>
                  {u.documents?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {u.documents.map((d, i) => (
                        <a key={i} href={d.url} target="_blank" className="badge-gray text-xs" rel="noreferrer">{d.kind}</a>
                      ))}
                      {u.selfieUrl && <a href={u.selfieUrl} target="_blank" className="badge-gray text-xs" rel="noreferrer">selfie</a>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'listings' && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Listings pending review</h2>
          {(data.items || []).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="font-medium text-gray-700">Nothing pending</p>
              <p className="mt-1 text-sm text-gray-500">All listings have been reviewed.</p>
            </div>
          ) : (
            <div className="-m-5 divide-y">
              {data.items.map((p) => (
                <div key={p._id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {p.media?.[0]?.url ? (
                      <img src={p.media[0].url} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover shadow-sm" />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100"><svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg></div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="mt-0.5 text-sm text-gray-500 truncate">{p.area} &middot; {naira(p.annualRent)}/yr &middot; by {p.landlord?.fullName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewProperty(p)} className="btn-ghost px-2.5 py-1.5 text-xs">View</button>
                    <button onClick={async () => { await api.post(`/admin/listings/${p._id}`, { decision: 'reject', reason: 'Insufficient detail' }); load('listings'); }} className="btn-outline px-3 py-1.5 text-xs">Reject</button>
                    <button onClick={async () => { await api.post(`/admin/listings/${p._id}`, { decision: 'approve' }); load('listings'); }} className="btn-primary px-3 py-1.5 text-xs">Approve</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {viewProperty && (
        <PropertyDetailModal property={viewProperty} naira={naira} onClose={() => setViewProperty(null)} />
      )}

      {tab === 'disputes' && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Open disputes</h2>
          {(data.items || []).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="font-medium text-gray-700">No disputes</p>
              <p className="mt-1 text-sm text-gray-500">All clear.</p>
            </div>
          ) : (
            <div className="-m-5 divide-y">
              {data.items.map((p) => (
                <div key={p._id} className="px-5 py-4 transition hover:bg-gray-50">
                  <p className="font-medium">{p.property?.title || 'Unknown'}</p>
                  <p className="mt-0.5 text-sm text-gray-500">Tenant: {p.tenant?.fullName} &middot; Landlord: {p.landlord?.fullName}</p>
                  {p.disputeReason && <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm italic text-red-700">&ldquo;{p.disputeReason}&rdquo;</p>}
                  <div className="mt-3 flex gap-2">
                    <button onClick={async () => { await api.post(`/admin/disputes/${p._id}`, { resolution: 'refund' }); load('disputes'); }} className="btn-danger px-3 py-1.5 text-xs">Refund tenant</button>
                    <button onClick={async () => { await api.post(`/admin/disputes/${p._id}`, { resolution: 'release' }); load('disputes'); }} className="btn-outline px-3 py-1.5 text-xs">Release to landlord</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'fraud' && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Bypass attempts (chat)</h2>
          {(data.items || []).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <p className="font-medium text-gray-700">No flagged conversations</p>
              <p className="mt-1 text-sm text-gray-500">All chat activity looks clean.</p>
            </div>
          ) : (
            <div className="-m-5 divide-y">
              {data.items.map((c) => (
                <div key={c._id} className="px-5 py-4 transition hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.property?.title}</p>
                    <span className="badge-warn">{c.bypassAttempts || 0} blocked</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {c.participants?.map((p) => `${p.fullName} (${p.role}, warns:${p.bypassWarnings})`).join(' &middot; ')}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {c.participants?.map((p) => (
                      <button key={p._id} onClick={async () => { await api.post(`/admin/users/${p._id}/suspend`, { reason: 'Repeated bypass attempts' }); load('fraud'); }} className="btn-outline px-3 py-1.5 text-xs">Suspend {p.fullName.split(' ')[0]}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {viewProperty && (
        <PropertyDetailModal property={viewProperty} naira={naira} onClose={() => setViewProperty(null)} />
      )}
    </Layout>
  );
}

function PropertyDetailModal({ property, naira, onClose }) {
  const images = property.media?.filter(m => m.type === 'image') || [];
  const videos = property.media?.filter(m => m.type === 'video') || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Property Details</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        {images.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.slice(0, 4).map((m, i) => (
              <img key={i} src={m.url} alt="" loading="lazy" className="aspect-[4/3] rounded-xl object-cover border border-gray-100" />
            ))}
          </div>
        )}

        <div className="space-y-3 text-sm">
          <Row label="Title" value={property.title} bold />
          <Row label="Area" value={property.area} />
          <Row label="Full Address" value={property.fullAddress || '—'} />
          <Row label="Landlord" value={property.landlord?.fullName || '—'} />
          <Row label="Type" value={property.propertyType?.replace(/-/g, ' ')} />
          <Row label="Furnishing" value={property.furnishing} />
          <Row label="Bed / Bath" value={`${property.bedrooms} bed / ${property.bathrooms} bath`} />
          <Row label="Annual Rent" value={naira(property.annualRent)} bold />
          <Row label="Inspection Fee" value={naira(property.inspectionFee)} />
          <Row label="Status" value={property.status?.replace(/_/g, ' ')} />
          {property.rejectionReason && <Row label="Rejection Reason" value={property.rejectionReason} />}
          <Row label="Featured" value={property.featured ? 'Yes' : 'No'} />
          <Row label="Views" value={String(property.viewCount || 0)} />
          <Row label="Created" value={new Date(property.createdAt).toLocaleDateString()} />
          <div className="border-b pb-2"><span className="font-medium text-gray-500">Description</span><p className="mt-1 text-gray-600 whitespace-pre-line">{property.description}</p></div>

          {videos.length > 0 && (
            <div className="border-b pb-2">
              <p className="mb-2 font-medium text-gray-500">Videos</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {videos.map((v, i) => (
                  <video key={i} src={v.url} controls className="w-full rounded-lg" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b pb-2">
      <span className="font-medium text-gray-500">{label}</span>
      <span className={`col-span-2 ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}
