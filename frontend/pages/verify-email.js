import { useRef, useState, useEffect } from 'react';
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
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (queryEmail) setEmail(queryEmail);
  }, [queryEmail]);

  async function handleVerify(e) {
    e.preventDefault();
    if (!email || !code) return showToast('Please enter the code', 'error');
    if (code.length !== 6) return showToast('Please enter the 6-digit code', 'error');

    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email, code });
      showToast('Email verified successfully! Redirecting to login...', 'success');
      setTimeout(() => router.push('/login'), 2000);
    } catch (e) {
      showToast(e?.response?.data?.error || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      showToast('Verification code resent!', 'success');
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to resend code', 'error');
    } finally {
      setResending(false);
    }
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

            <button
              disabled={loading}
              className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-brand-200 hover:shadow-brand-300 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? <span className="spinner" /> : 'Verify Email'}
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
