import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import VerificationBadge from '../../../components/VerificationBadge';
import PaymentsPanel from '../../../components/PaymentsPanel';
import api, { getUser } from '../../../lib/api';
import { naira, shortDate } from '../../../lib/format';

export default function LandlordDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [tab, setTab] = useState('listings');

  useEffect(() => {
    setUser(getUser());
    api.get('/properties/mine').then(({ data }) => setListings(data.items)).catch(() => {});
    api.get('/inspections/mine').then(({ data }) => setInspections(data.items)).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <Layout wide>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landlord dashboard</h1>
          <p className="text-sm text-gray-600">{user.fullName}</p>
        </div>
        <div className="flex items-center gap-3">
          <VerificationBadge user={user} />
          <Link href="/dashboard/landlord/new" className="btn-primary">+ New listing</Link>
        </div>
      </div>

      {user.verificationStatus !== 'approved' && (
        <div className="card mb-6 border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-amber-900">Verification required</h3>
          <p className="mt-1 text-sm text-amber-800">Submit your NIN, utility bill, and property documents to start listing.</p>
          <Link href="/verify" className="btn-primary mt-3">Continue verification</Link>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {['listings', 'inspections', 'agreements'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-1.5 text-sm capitalize ${tab === t ? 'bg-brand-600 text-white' : 'border border-gray-200 bg-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'listings' && (
        <section className="card">
          <h2 className="font-semibold">Your listings</h2>
          {listings.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No listings yet.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {listings.map((l) => (
                <li key={l._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{l.title} {l.featured && <span className="badge ml-1">Featured</span>}</p>
                    <p className="text-xs text-gray-500">{l.area} · {naira(l.annualRent)}/yr · views {l.viewCount}</p>
                    {l.aiScores && (
                      <p className="mt-1 text-xs text-gray-500">
                        Authenticity: <b>{l.aiScores.authenticity ?? '—'}</b> · Price fairness: <b>{l.aiScores.priceFairness ?? '—'}</b> · Media: <b>{l.aiScores.mediaQuality ?? '—'}</b>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-gray capitalize">{l.status.replace('_', ' ')}</span>
                    <Link href={`/listings/${l._id}`} className="btn-outline">View</Link>
                    {l.status === 'draft' && (
                      <button onClick={async () => { await api.post(`/properties/${l._id}/publish`); router.reload(); }} className="btn-primary">Submit for review</button>
                    )}
                    {l.status === 'active' && !l.featured && (
                      <button
                        onClick={async () => {
                          const { data } = await api.post(`/properties/${l._id}/feature`);
                          window.location.href = data.authorizationUrl + (data.authorizationUrl.includes('?') ? '&' : '?') + `featurePropertyId=${l._id}`;
                        }}
                        className="btn-outline">
                        ✨ Promote ({naira(5000)}/30d)
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'inspections' && (
        <section className="card">
          <h2 className="font-semibold">Upcoming & past inspections</h2>
          {inspections.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No inspections booked yet.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {inspections.map((i) => (
                <li key={i._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{i.property?.title}</p>
                    <p className="text-xs text-gray-500">{shortDate(i.scheduledFor)} · {i.feeStatus}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-gray capitalize">{i.status.replace('_', ' ')}</span>
                    {i.feeStatus === 'paid' && i.status === 'booked' && (
                      <Link href={`/inspections/scan/${i.qrToken}`} className="btn-primary">Mark as met (scan)</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'agreements' && (
        <section className="card">
          <h2 className="font-semibold">Agreements &amp; escrow</h2>
          <p className="mb-3 text-xs text-gray-500">
            Sign the agreement to formalise the tenancy. Funds release to you when the tenant confirms move-in.
          </p>
          <PaymentsPanel role="landlord" />
        </section>
      )}
    </Layout>
  );
}
