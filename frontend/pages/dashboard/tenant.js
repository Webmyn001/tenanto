import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import VerificationBadge from '../../components/VerificationBadge';
import PaymentsPanel from '../../components/PaymentsPanel';
import api, { getUser } from '../../lib/api';
import { naira, shortDate } from '../../lib/format';

export default function TenantDashboard() {
  const [user, setUser] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    setUser(getUser());
    api.get('/inspections/mine').then(({ data }) => setInspections(data.items)).catch(() => {});
    api.get('/properties/recommended').then(({ data }) => setRecs(data.items)).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <Layout wide>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.fullName.split(' ')[0]}</h1>
          <p className="text-sm text-gray-600">Your inspections, payments, and agreements live here.</p>
        </div>
        <VerificationBadge user={user} />
      </div>

      {user.verificationStatus !== 'approved' && (
        <div className="card mb-6 border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-amber-900">Finish verification to book inspections</h3>
          <Link href="/verify" className="btn-primary mt-3">Continue verification</Link>
        </div>
      )}

      <section className="card">
        <h2 className="font-semibold">Your inspections</h2>
        {inspections.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No inspections yet. <Link href="/listings" className="text-brand-700 underline">Browse listings</Link>.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {inspections.map((i) => (
              <li key={i._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{i.property?.title}</p>
                  <p className="text-xs text-gray-500">{shortDate(i.scheduledFor)} · fee {naira(i.inspectionFee)} · {i.feeStatus}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-gray capitalize">{i.status}</span>
                  {i.status === 'completed' && !i.tenantRated && (
                    <Link href={`/inspections/${i._id}/rate`} className="btn-primary">Rate & unlock pay</Link>
                  )}
                  {i.paymentUnlocked && (
                    <Link href={`/payments/new?propertyId=${i.property._id}`} className="btn-outline">Pay rent</Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-6">
        <h2 className="font-semibold">Payments &amp; escrow</h2>
        <p className="mb-3 text-xs text-gray-500">
          Funds stay in escrow until you confirm move-in. Sign the agreement once it&apos;s generated.
        </p>
        <PaymentsPanel role="tenant" />
      </section>

      {recs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 font-semibold">Recommended for you</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recs.slice(0, 6).map((p) => (
              <Link key={p._id} href={`/listings/${p._id}`} className="card hover:shadow-md">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-gray-500">{p.area}</p>
                <p className="mt-2 font-semibold text-brand-700">{naira(p.annualRent)}/yr</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
