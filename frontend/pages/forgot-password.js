import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    if (!email) { showToast('Please enter your email address', 'error'); setLoading(false); return; }
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      showToast(data.message || 'Code sent! Check your email.', 'success');
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 3000);
    } catch (e) {
      showToast(e?.response?.data?.error || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we'll send you a 6-digit code to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input focus:ring-brand-500"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              disabled={loading}
              className="btn-primary w-full py-3 text-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="spinner mr-2" />
                  Sending...
                </span>
              ) : 'Send Reset Code'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-brand-700 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
