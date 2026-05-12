import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';

export default function RateInspection() {
  const router = useRouter();
  const { id } = router.query;
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [accuracy, setAccuracy] = useState(5);
  const [cleanliness, setCleanliness] = useState(5);
  const [responsiveness, setResponsiveness] = useState(5);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      await api.post(`/inspections/${id}/rate`, {
        rating, body, accuracy, cleanliness, landlordResponsiveness: responsiveness,
      });
      router.push('/dashboard/tenant');
    } catch (e) { setErr(e?.response?.data?.error || 'Failed'); }
  }

  function Stars({ value, onChange }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`text-2xl ${n <= value ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
        ))}
      </div>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-xl">
        <div className="card">
          <h1 className="text-xl font-bold">Rate this inspection</h1>
          <p className="mt-1 text-sm text-gray-600">Rating unlocks payment for this property.</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div><p className="label">Overall</p><Stars value={rating} onChange={setRating} /></div>
            <div><p className="label">Listing accuracy</p><Stars value={accuracy} onChange={setAccuracy} /></div>
            <div><p className="label">Cleanliness</p><Stars value={cleanliness} onChange={setCleanliness} /></div>
            <div><p className="label">Landlord responsiveness</p><Stars value={responsiveness} onChange={setResponsiveness} /></div>
            <div>
              <label className="label">Comments (optional)</label>
              <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="btn-primary w-full">Submit & unlock payment</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
