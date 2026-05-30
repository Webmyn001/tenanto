import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import AddressGate from '../../components/AddressGate';
import api, { getUser } from '../../lib/api';
import { naira } from '../../lib/format';

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => {
    if (!id) return;
    api.get(`/properties/${id}`).then(({ data }) => setData(data)).catch(() => setData(null));
  }, [id]);

  if (!data) return <Layout><div className="card skeleton h-72" /></Layout>;
  const p = data.property;

  async function bookInspection() {
    setErr('');
    if (!user) return router.push('/login');
    if (!bookingDate) return setErr('Pick a date and time first');
    try {
      const { data: r } = await api.post('/inspections', { propertyId: p._id, scheduledFor: bookingDate });
      if (r.payment?.authorizationUrl) {
        window.location.href = r.payment.authorizationUrl + (r.payment.authorizationUrl.includes('?') ? '&' : '?') + `inspectionRef=${r.payment.reference}`;
      }
    } catch (e) { setErr(e?.response?.data?.error || 'Could not book'); }
  }

  async function startChat() {
    if (!user) return router.push('/login');
    const { data: convo } = await api.post('/chat/conversations', { propertyId: p._id });
    router.push(`/chat/${convo._id}`);
  }

  const images = p.media?.filter((m) => m.type === 'image') || [];
  const videos = p.media?.filter((m) => m.type === 'video') || [];

  return (
    <Layout wide>
      <button onClick={() => router.back()} className="btn-ghost mb-3 text-sm">← Back to listings</button>

      {/* Image gallery — responsive mosaic */}
      <div className="grid gap-1.5 sm:grid-cols-4 sm:grid-rows-2 sm:gap-2">
        {images[0] && (
          <div className="relative overflow-hidden rounded-xl sm:col-span-2 sm:row-span-2 sm:rounded-2xl">
            <img src={images[0].url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 hover:scale-[1.02] sm:aspect-auto sm:h-full"/>
          </div>
        )}
        {images.slice(1, 5).map((m, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl sm:rounded-xl">
            <img src={m.url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 hover:scale-[1.02]"/>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* MAIN COLUMN */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{p.title}</h1>
              <p className="mt-1 text-ink-500">📍 {p.area} · {p.propertyType?.replace('-', ' ')} · {p.furnishing}</p>
            </div>
            {p.featured && <span className="badge-warn">★ Featured</span>}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Bedrooms" value={p.bedrooms} icon="🛏" />
            <Stat label="Bathrooms" value={p.bathrooms} icon="🚿" />
            <Stat label="Distance" value={p.distanceToAnchorKm != null ? `${p.distanceToAnchorKm} km` : '—'} icon="📐" />
          </div>

          <div className="card mt-5">
            <h2 className="font-display font-bold">About this place</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{p.description}</p>
          </div>

          {videos.length > 0 && (
            <div className="card mt-5">
              <h2 className="font-display font-bold">Walkthrough videos</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {videos.map((v, i) => (
                  <video key={i} src={v.url} controls className="w-full rounded-xl shadow-sm" />
                ))}
              </div>
            </div>
          )}

          {p.aiScores && (p.aiScores.priceFairness != null || p.aiScores.mediaQuality != null || p.aiScores.authenticity != null) && (
            <div className="card mt-5">
              <h2 className="font-display font-bold">Trust signals</h2>
              <p className="mt-1 text-xs text-ink-500">Auto-computed from price comparisons, media completeness, and account signals.</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ['Authenticity', p.aiScores.authenticity, 'Lower = fake risk'],
                  ['Price fairness', p.aiScores.priceFairness, 'Vs area median'],
                  ['Media quality', p.aiScores.mediaQuality, 'Photos, videos, detail'],
                ].map(([label, score, hint]) => (
                  <div key={label} className={`rounded-xl p-3 ${
                    score == null ? 'bg-ink-100' :
                    score >= 75 ? 'bg-brand-50 text-brand-800' :
                    score >= 50 ? 'bg-accent-50 text-accent-800' :
                                  'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-2xl font-extrabold">{score ?? '—'}</p>
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="mt-1 text-[10px] opacity-80">{hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR — sticky on desktop, normal flow on mobile */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card-elevated">
            <p className="text-sm text-ink-500">Annual rent</p>
            <p className="mt-1 text-3xl font-extrabold text-brand-700">{naira(p.annualRent)}</p>
            {p.installmentEnabled && (
              <p className="mt-1 text-sm text-ink-500">
                Installments from <b>{naira(Math.ceil(p.annualRent / (p.installmentPlan?.months || 6)))}/mo</b>
              </p>
            )}
            <hr className="my-3 border-ink-100"/>
            <ul className="space-y-1 text-sm text-ink-700">
              <li className="flex justify-between"><span>Service charge</span><b>{naira(p.serviceCharge)}</b></li>
              <li className="flex justify-between"><span>Caution fee</span><b>{naira(p.cautionFee)}</b></li>
              <li className="flex justify-between"><span>Inspection fee</span><b>{naira(p.inspectionFee)}</b></li>
              <li className="text-xs text-brand-700">↳ refundable / credited to rent</li>
            </ul>
          </div>

          {data.addressRevealed ? (
            <div className="card border-brand-200 bg-brand-50">
              <h3 className="font-display font-bold text-brand-900">📍 Full address</h3>
              <p className="mt-1 text-brand-800">{p.fullAddress}</p>
              <p className="mt-2 text-xs text-brand-700">Visible because you have an active inspection or payment.</p>
            </div>
          ) : (
            <AddressGate property={p} onBook={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })} />
          )}

          <div id="book" className="card">
            <h3 className="font-display font-bold">Book inspection</h3>
            <input type="datetime-local" className="input mt-3" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <button onClick={bookInspection} className="btn-primary mt-3 w-full">Pay {naira(p.inspectionFee)} & book</button>
            <button onClick={startChat} className="btn-outline mt-2 w-full">💬 Message landlord</button>
            <p className="mt-2 text-xs text-ink-500">Phone numbers, emails, and external links in chat are automatically blocked.</p>
          </div>

          <div className="card border-accent-200 bg-accent-50 text-xs text-accent-800">
            ⚠️ <b>Never pay outside the platform.</b> Off-platform payments aren't escrow-protected and can't be refunded.
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-ink-500">Annual rent</p>
            <p className="font-extrabold text-brand-700">{naira(p.annualRent)}</p>
          </div>
          <button onClick={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="btn-primary">Book inspection</button>
        </div>
      </div>
      <div className="h-20 lg:hidden" />
    </Layout>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="card-elevated p-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="mt-1 text-xs text-ink-500">{label}</div>
      <div className="text-base font-bold text-ink-900">{value}</div>
    </div>
  );
}
