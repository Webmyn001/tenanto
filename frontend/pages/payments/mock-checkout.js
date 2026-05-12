import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';

export default function MockCheckout() {
  const router = useRouter();
  const { ref, inspectionRef, paymentId, featurePropertyId } = router.query;
  const [status, setStatus] = useState('idle');
  const [err, setErr] = useState('');

  async function approve() {
    setStatus('working'); setErr('');
    try {
      if (inspectionRef) {
        await api.post('/inspections/confirm-fee', { reference: inspectionRef });
      } else if (featurePropertyId) {
        await api.post(`/properties/${featurePropertyId}/feature/confirm`, { reference: ref, propertyId: featurePropertyId });
      } else {
        await api.post('/payments/confirm', { reference: ref, paymentId });
      }
      setStatus('done');
    } catch (e) { setErr(e?.response?.data?.error || 'Confirm failed'); setStatus('idle'); }
  }

  useEffect(() => { /* allow user to click Approve manually so it's clear it's a mock */ }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-md">
        <div className="card text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-700">⚠️</div>
          <h1 className="text-xl font-bold">Mock Paystack checkout</h1>
          <p className="mt-1 text-sm text-gray-600">
            Real Paystack isn't wired up (MOCK_THIRD_PARTY=true). Click below to simulate a successful payment.
          </p>
          <p className="mt-2 break-all text-xs text-gray-400">ref: {ref || inspectionRef}</p>
          {status !== 'done' ? (
            <button onClick={approve} disabled={status === 'working'} className="btn-primary mt-5 w-full">
              {status === 'working' ? '…' : 'Approve mock payment'}
            </button>
          ) : (
            <>
              <p className="mt-5 text-brand-700">✓ Marked as paid.</p>
              <button onClick={() => router.push('/dashboard/tenant')} className="btn-primary mt-3 w-full">Go to dashboard</button>
            </>
          )}
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>
      </div>
    </Layout>
  );
}
