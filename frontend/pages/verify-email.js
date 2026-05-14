import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';

export default function VerifyEmail() {
  const router = useRouter();
  const { email: queryEmail } = router.query;

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (queryEmail) setEmail(queryEmail);
  }, [queryEmail]);

  async function handleVerify(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (code.length !== 6) return setErr('Please enter the 6-digit code');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, code });
      setMsg(data.message);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setErr('');
    setMsg('');
    setResending(true);
    try {
      const { data } = await api.post('/auth/resend-verification', { email });
      setMsg(data.message);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-md pt-12">
        <div className="card shadow-xl border-t-4 border-brand-600">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Verify Your Email</h1>
          <p className="mt-2 text-sm text-center text-gray-600">
            We've sent a 6-digit verification code to <b>{email || 'your email'}</b>.
          </p>

          <form onSubmit={handleVerify} className="mt-8 space-y-6">
            <div className="space-y-1 text-center">
              <label className="label text-center block">Enter 6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                className="input text-center text-3xl font-bold tracking-[0.4em] py-4 focus:ring-brand-500"
                placeholder="000000"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {err && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg text-center">{err}</p>}
            {msg && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg text-center">{msg}</p>}

            <button
              disabled={loading}
              className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-brand-200 hover:shadow-brand-300 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-8 text-center border-t pt-6">
            <p className="text-sm text-gray-600">
              Didn't receive the code?{' '}
              <button
                type="button"
                disabled={resending}
                onClick={handleResend}
                className="text-brand-700 font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            </p>
            <Link href="/login" className="mt-4 block text-xs text-gray-500 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
