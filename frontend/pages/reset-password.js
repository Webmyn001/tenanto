import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import api from '../lib/api';

export default function ResetPassword() {
  const router = useRouter();
  const { email: queryEmail } = router.query;

  const [form, setForm] = useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (queryEmail) {
      setForm((f) => ({ ...f, email: queryEmail }));
    }
  }, [queryEmail]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.email || !form.code || !form.password || !form.confirmPassword) {
      return showToast('Please fill in all fields', 'error');
    }
    if (form.password !== form.confirmPassword) {
      return showToast('Passwords do not match', 'error');
    }
    if (form.code.length !== 6) {
      return showToast('Please enter the 6-digit code', 'error');
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: form.email,
        code: form.code,
        password: form.password,
      });
      showToast('Password reset successfully! Redirecting to login...', 'success');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (e) {
      showToast(e?.response?.data?.error || 'Invalid code or email. Please try again.', 'error');
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
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Check your email for the 6-digit code we sent you.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="label">6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                className="input tracking-[0.5em] text-center text-xl font-bold"
                placeholder="000000"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, '') })}
              />
            </div>

            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>

            <button
              disabled={loading}
              className="btn-primary w-full py-3 text-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? <span className="spinner mr-2" /> : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Didn't get a code? <Link href="/forgot-password" title="Go back to forgot password page" className="text-brand-700 hover:underline">Try again</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
