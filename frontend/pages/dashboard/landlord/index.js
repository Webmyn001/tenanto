import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import VerificationBadge from '../../../components/VerificationBadge';
import PaymentsPanel from '../../../components/PaymentsPanel';
import api, { getUser } from '../../../lib/api';
import { naira, shortDate } from '../../../lib/format';

const STATUS_STYLES = {
  draft: { badge: 'bg-gray-100 text-gray-700', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  pending_review: { badge: 'bg-amber-100 text-amber-700', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  active: { badge: 'bg-green-100 text-green-700', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  rejected: { badge: 'bg-red-100 text-red-700', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
};

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

export default function LandlordDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [tab, setTab] = useState('listings');

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u && u.role !== 'admin' && u.verificationStatus !== 'approved') { router.replace('/verify'); return; }
    api.get('/properties/mine').then(({ data }) => setListings(data.items)).catch(() => {});
    api.get('/inspections/mine').then(({ data }) => setInspections(data.items)).catch(() => {});
  }, []);

  if (!user) return <Layout><div className="flex min-h-[50vh] items-center justify-center"><span className="spinner h-8 w-8 text-brand-600" /></div></Layout>;

  const activeListings = listings.filter(l => l.status === 'active').length;
  const pendingListings = listings.filter(l => l.status === 'pending_review').length;
  const draftListings = listings.filter(l => l.status === 'draft').length;
  const totalViews = listings.reduce((s, l) => s + (l.viewCount || 0), 0);

  return (
    <Layout wide>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.fullName.split(' ')[0]}</h1>
          <p className="text-sm text-gray-500">Here&apos;s what&apos;s happening with your properties.</p>
        </div>
        <div className="flex items-center gap-3">
          <VerificationBadge user={user} />
          <Link href="/dashboard/landlord/new" className="btn-primary">+ New listing</Link>
        </div>
      </div>

      {user.verificationStatus !== 'approved' && (
        <div className="card mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">
              <svg className="h-5 w-5 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Verification required</h3>
              <p className="text-sm text-amber-700">Submit your NIN, utility bill, and property documents to start listing.</p>
            </div>
            <Link href="/verify" className="btn-primary shrink-0">Continue verification</Link>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active listings" value={activeListings} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-green-500" />
        <StatCard label="Pending review" value={pendingListings} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-amber-500" />
        <StatCard label="Drafts" value={draftListings} icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" color="bg-gray-500" />
        <StatCard label="Total views" value={totalViews} icon="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" color="bg-blue-500" />
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {['listings', 'inspections', 'agreements'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>{t}</button>
        ))}
      </div>

      {tab === 'listings' && (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Your listings</h2>
            <span className="text-sm text-gray-400">{listings.length} total</span>
          </div>
          {listings.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <p className="font-medium text-gray-700">No listings yet</p>
              <p className="mt-1 text-sm text-gray-500">Create your first listing to get started.</p>
              <Link href="/dashboard/landlord/new" className="btn-primary mt-4">+ Create listing</Link>
            </div>
          ) : (
            <div className="-m-5 divide-y">
              {listings.map((l) => {
                const st = STATUS_STYLES[l.status] || STATUS_STYLES.draft;
                return (
                  <div key={l._id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {l.media?.[0]?.url ? (
                        <img src={l.media[0].url} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover shadow-sm" />
                      ) : (
                        <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100"><svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg></div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{l.title}</p>
                          {l.featured && <span className="badge shrink-0">Featured</span>}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">{l.area} &middot; {naira(l.annualRent)}/yr &middot; {l.viewCount || 0} views</p>
                      {l.aiScores && (
                        <div className="mt-1 flex gap-3 text-xs text-gray-400">
                          <span>Authenticity <b>{l.aiScores.authenticity ?? '—'}</b></span>
                          <span>Price <b>{l.aiScores.priceFairness ?? '—'}</b></span>
                          <span>Media <b>{l.aiScores.mediaQuality ?? '—'}</b></span>
                        </div>
                      )}
                    </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${st.badge}`}>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={st.icon} /></svg>
                        {l.status.replace(/_/g, ' ')}
                      </span>
                      <Link href={`/listings/${l._id}`} className="btn-outline px-3 py-1.5 text-xs">View</Link>
                      {l.status === 'draft' && (
                        <button onClick={async () => { await api.post(`/properties/${l._id}/publish`); router.reload(); }} className="btn-primary px-3 py-1.5 text-xs">Submit</button>
                      )}
                      {l.status === 'active' && !l.featured && (
                        <button onClick={async () => { const { data } = await api.post(`/properties/${l._id}/feature`); window.location.href = data.authorizationUrl + (data.authorizationUrl.includes('?') ? '&' : '?') + `featurePropertyId=${l._id}`; }} className="btn-outline px-3 py-1.5 text-xs">Promote</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'inspections' && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Upcoming &amp; past inspections</h2>
          {inspections.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="font-medium text-gray-700">No inspections booked</p>
              <p className="mt-1 text-sm text-gray-500">Inspections will appear here once tenants book them.</p>
            </div>
          ) : (
            <div className="-m-5 divide-y">
              {inspections.map((i) => (
                <div key={i._id} className="flex items-center justify-between px-5 py-4 transition hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{i.property?.title || 'Unknown property'}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{shortDate(i.scheduledFor)} &middot; {i.feeStatus}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-gray capitalize">{i.status.replace('_', ' ')}</span>
                    {i.feeStatus === 'paid' && i.status === 'booked' && (
                      <Link href={`/inspections/scan/${i.qrToken}`} className="btn-primary px-3 py-1.5 text-xs">Mark met</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'agreements' && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Agreements &amp; escrow</h2>
          <div className="mb-4 rounded-xl bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm text-gray-600">Sign the agreement to formalise the tenancy. Funds release to you when the tenant confirms move-in.</p>
            </div>
          </div>
          <PaymentsPanel role="landlord" />
        </section>
      )}
    </Layout>
  );
}
