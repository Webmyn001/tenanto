import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import AddressGate from '../../components/AddressGate';
import api, { getUser } from '../../lib/api';
import { naira, shortDate } from '../../lib/format';

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [qr, setQr] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => {
    if (!id) return;
    api.get(`/properties/${id}`).then(({ data }) => setData(data)).catch(() => setData(null));
  }, [id]);

  if (!data) return <Layout><div className="card animate-pulse h-72" /></Layout>;
  const p = data.property;

  async function bookInspection() {
    setErr('');
    if (!user) return router.push('/login');
    if (!bookingDate) return setErr('Pick a date and time first');
    try {
      const { data: r } = await api.post('/inspections', { propertyId: p._id, scheduledFor: bookingDate });
      // Redirect to mock checkout (or real Paystack url)
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
      <button onClick={() => router.back()} className="mb-4 text-sm text-gray-600 hover:underline">← Back</button>

      <div className="grid gap-2 md:grid-cols-4">
        {images.slice(0, 4).map((m, i) => (
          <img key={i} src={m.url} alt="" className={`aspect-[4/3] w-full rounded-lg object-cover ${i === 0 ? 'md:col-span-2 md:row-span-2 md:aspect-square' : ''}`} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold">{p.title}</h1>
          <p className="mt-1 text-gray-600">{p.area} · {p.propertyType?.replace('-', ' ')} · {p.furnishing}</p>

          <div className="mt-5 grid grid-cols-3 gap-4 text-center">
            <div className="card"><div className="text-xs text-gray-500">Bedrooms</div><div className="text-lg font-semibold">{p.bedrooms}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Bathrooms</div><div className="text-lg font-semibold">{p.bathrooms}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Distance</div><div className="text-lg font-semibold">{p.distanceToAnchorKm ?? '—'} km</div></div>
          </div>

          <div className="card mt-6">
            <h2 className="font-semibold">About this place</h2>
            <p className="mt-2 whitespace-pre-line text-gray-700">{p.description}</p>
          </div>

          {videos.length > 0 && (
            <div className="card mt-6">
              <h2 className="font-semibold">Walkthrough videos</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {videos.map((v, i) => (
                  <video key={i} src={v.url} controls className="w-full rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {p.aiScores && (p.aiScores.priceFairness != null || p.aiScores.mediaQuality != null || p.aiScores.authenticity != null) && (
            <div className="card mt-6">
              <h2 className="font-semibold">Trust signals</h2>
              <p className="mt-1 text-xs text-gray-500">Auto-computed scores from price comparisons, media completeness, and account signals.</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ['Authenticity', p.aiScores.authenticity, 'Higher = lower fake-listing risk'],
                  ['Price fairness', p.aiScores.priceFairness, 'Vs area median'],
                  ['Media quality', p.aiScores.mediaQuality, 'Photos, videos, detail'],
                ].map(([label, score, hint]) => (
                  <div key={label} className={`rounded-lg p-3 ${
                    score == null ? 'bg-gray-50' :
                    score >= 75 ? 'bg-brand-50 text-brand-800' :
                    score >= 50 ? 'bg-amber-50 text-amber-800' :
                                  'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-2xl font-bold">{score ?? '—'}</p>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="mt-1 text-[10px] opacity-80">{hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card">
            <p className="text-sm text-gray-500">Annual rent</p>
            <p className="text-3xl font-bold text-brand-700">{naira(p.annualRent)}</p>
            {p.installmentEnabled && <p className="mt-1 text-sm text-gray-600">Installments from {naira(Math.ceil(p.annualRent / (p.installmentPlan?.months || 6)))}/mo</p>}
            <hr className="my-3" />
            <ul className="text-sm text-gray-600">
              <li>Service charge: {naira(p.serviceCharge)}</li>
              <li>Caution fee: {naira(p.cautionFee)}</li>
              <li>Inspection fee: {naira(p.inspectionFee)} (refundable / credited)</li>
            </ul>
          </div>

          {data.addressRevealed ? (
            <div className="card border-brand-200 bg-brand-50">
              <h3 className="font-semibold text-brand-900">Full address</h3>
              <p className="mt-1 text-brand-800">{p.fullAddress}</p>
              <p className="mt-2 text-xs text-brand-700">Visible because you have an active inspection or payment.</p>
            </div>
          ) : (
            <AddressGate property={p} onBook={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })} />
          )}

          <div id="book" className="card">
            <h3 className="font-semibold">Book inspection</h3>
            <input type="datetime-local" className="input mt-3" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <button onClick={bookInspection} className="btn-primary mt-3 w-full">Pay {naira(p.inspectionFee)} & book</button>
            <button onClick={startChat} className="btn-outline mt-2 w-full">Message landlord</button>
            <p className="mt-2 text-xs text-gray-500">Sharing phone numbers, emails or external links in chat is automatically blocked.</p>
          </div>

          <div className="card border-amber-200 bg-amber-50 text-xs text-amber-800">
            ⚠️ <b>Never pay outside the platform.</b> Off-platform payments aren't escrow-protected and can't be refunded.
          </div>
        </aside>
      </div>
    </Layout>
  );
}
