import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import VerificationBadge from '../../components/VerificationBadge';
import PaymentsPanel from '../../components/PaymentsPanel';
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

export default function TenantDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u && u.role !== 'admin' && u.verificationStatus !== 'approved') { router.replace('/verify'); return; }
    api.get('/inspections/mine').then(({ data }) => setInspections(data.items)).catch(() => {});
    api.get('/properties/recommended').then(({ data }) => setRecs(data.items)).catch(() => {});
  }, []);

  if (!user) return <Layout><div className="flex min-h-[50vh] items-center justify-center"><span className="spinner h-8 w-8 text-brand-600" /></div></Layout>;
  if (user.role === 'admin') return <Layout><div className="card text-center">Tenants only.</div></Layout>;

  const bookedInspections = inspections.filter(i => i.status === 'booked').length;
  const completedInspections = inspections.filter(i => i.status === 'completed').length;
  const pendingPayments = inspections.filter(i => i.paymentUnlocked && !i.tenantRated).length;

  return (
    <Layout wide>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.fullName.split(' ')[0]}</h1>
          <p className="text-sm text-gray-500">Your inspections, payments, and agreements at a glance.</p>
        </div>
        <VerificationBadge user={user} />
      </div>

      {user.verificationStatus !== 'approved' && (
        <div className="card mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">
              <svg className="h-5 w-5 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Finish verification to book inspections</h3>
              <p className="text-sm text-amber-700">Verify your identity and school email to start booking.</p>
            </div>
            <Link href="/verify" className="btn-primary shrink-0">Continue</Link>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Booked inspections" value={bookedInspections} icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" color="bg-blue-500" />
        <StatCard label="Completed" value={completedInspections} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-green-500" />
        <StatCard label="Pending payments" value={pendingPayments} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-amber-500" />
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Your inspections</h2>
          <span className="text-sm text-gray-400">{inspections.length} total</span>
        </div>
        {inspections.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            <p className="font-medium text-gray-700">No inspections yet</p>
            <p className="mt-1 text-sm text-gray-500">Browse listings and book an inspection to get started.</p>
            <Link href="/listings" className="btn-primary mt-4">Browse listings</Link>
          </div>
        ) : (
          <div className="-m-5 divide-y">
            {inspections.map((i) => (
              <div key={i._id} className="flex items-center justify-between px-5 py-4 transition hover:bg-gray-50">
                <div>
                  <p className="font-medium">{i.property?.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{shortDate(i.scheduledFor)} &middot; fee {naira(i.inspectionFee)} &middot; {i.feeStatus}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-gray capitalize">{i.status}</span>
                  {i.status === 'completed' && !i.tenantRated && (
                    <Link href={`/inspections/${i._id}/rate`} className="btn-primary px-3 py-1.5 text-xs">Rate &amp; unlock pay</Link>
                  )}
                  {i.paymentUnlocked && (
                    <Link href={`/payments/new?propertyId=${i.property._id}`} className="btn-outline px-3 py-1.5 text-xs">Pay rent</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card mt-6">
        <h2 className="mb-3 font-semibold">Payments &amp; escrow</h2>
        <div className="mb-4 rounded-xl bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm text-gray-600">Funds stay in escrow until you confirm move-in. Sign the agreement once it&apos;s generated.</p>
          </div>
        </div>
        <PaymentsPanel role="tenant" />
      </section>

      {recs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-semibold">Recommended for you</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recs.slice(0, 6).map((p) => (
              <Link key={p._id} href={`/listings/${p._id}`} className="card group overflow-hidden p-0 transition hover:shadow-lg hover:-translate-y-0.5">
                {p.media?.[0]?.url ? (
                  <div className="relative overflow-hidden">
                    <img src={p.media[0].url} alt={p.title} loading="lazy" className="h-40 w-full object-cover transition duration-500 group-hover:scale-105" />
                    {p.media.filter(m => m.type === 'image').length > 1 && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">📷 {p.media.filter(m => m.type === 'image').length}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center bg-gray-100">
                    <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                  </div>
                )}
                <div className="p-4">
                  <p className="font-medium group-hover:text-brand-700">{p.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{p.area}</p>
                  <p className="mt-2 font-semibold text-brand-700">{naira(p.annualRent)}/yr</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
