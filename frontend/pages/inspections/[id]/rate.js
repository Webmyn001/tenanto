import { useRef, useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  async function submit(e) {
    e.preventDefault();
    if (!body.trim()) return showToast('Please add a comment', 'error');
    setLoading(true);
    try {
      await api.post(`/inspections/${id}/rate`, {
        rating, body, accuracy, cleanliness, landlordResponsiveness: responsiveness,
      });
      showToast('Rating submitted ✓', 'success');
      setTimeout(() => router.push('/dashboard/tenant'), 1500);
    } catch (e) { showToast(e?.response?.data?.error || 'Failed to submit rating', 'error'); }
    finally { setLoading(false); }
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
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] animate-slide-down">
          <div className={`rounded-xl text-white px-5 py-3.5 text-sm font-medium shadow-xl flex items-center gap-2.5 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{toast.msg}</span>
          </div>
        </div>
      )}
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
              <label className="label">Comments</label>
              <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
            <button disabled={loading} className="btn-primary w-full">
              {loading ? <span className="spinner" /> : 'Submit & unlock payment'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
