import { useState, useEffect } from 'react';
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
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (queryEmail) {
      setForm((f) => ({ ...f, email: queryEmail }));
    }
  }, [queryEmail]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    if (form.password !== form.confirmPassword) {
      return setErr('Passwords do not match');
    }

    if (form.code.length !== 6) {
      return setErr('Please enter the 6-digit code');
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: form.email,
        code: form.code,
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Invalid code or email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="mx-auto max-w-md pt-12 text-center">
          <div className="card border-green-500 border-t-4">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Success!</h1>
            <p className="mt-2 text-gray-600">Your password has been reset successfully.</p>
            <p className="mt-4 text-sm text-gray-500 italic">Redirecting you to login...</p>
            <Link href="/login" className="btn-primary mt-6 block w-full">Login Now</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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

            {err && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</p>}

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
