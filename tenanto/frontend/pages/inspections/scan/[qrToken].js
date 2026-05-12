import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';

export default function ScanInspection() {
  const router = useRouter();
  const { qrToken } = router.query;
  const [status, setStatus] = useState('idle');
  const [err, setErr] = useState('');
  const [insp, setInsp] = useState(null);

  useEffect(() => {
    if (!qrToken) return;
    setStatus('working');
    api.get(`/inspections/scan/${qrToken}`)
      .then(({ data }) => { setInsp(data.inspection); setStatus('done'); })
      .catch((e) => { setErr(e?.response?.data?.error || 'Failed'); setStatus('idle'); });
  }, [qrToken]);

  return (
    <Layout>
      <div className="mx-auto max-w-md">
        <div className="card text-center">
          {status === 'working' && <p>Verifying QR…</p>}
          {status === 'done' && (
            <>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">✓</div>
              <h1 className="text-xl font-bold">Meeting confirmed</h1>
              <p className="mt-1 text-sm text-gray-600">Inspection logged. The tenant can now rate the visit.</p>
              <button onClick={() => router.push('/dashboard/landlord')} className="btn-primary mt-4 w-full">Back to dashboard</button>
            </>
          )}
          {err && <>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-700">!</div>
            <h1 className="text-xl font-bold">Couldn't confirm</h1>
            <p className="mt-1 text-sm text-red-600">{err}</p>
          </>}
        </div>
      </div>
    </Layout>
  );
}
