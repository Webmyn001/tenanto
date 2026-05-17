import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import api, { saveAuth } from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      saveAuth(data.token, data.user);
      const dash = data.user.role === 'admin' ? '/dashboard/admin'
                 : data.user.role === 'landlord' ? '/dashboard/landlord'
                 : '/dashboard/tenant';
      router.push(dash);
    } catch (e) {
      if (e?.response?.data?.unverified) {
        return router.push(`/verify-email?email=${encodeURIComponent(e.response.data.email || form.email)}`);
      }
      setErr(e?.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-gray-600">Welcome back.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                <Link href="/forgot-password" title="Go to forgot password page" className="text-xs text-brand-700 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <input type="password" className="input" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={loading} className="btn-primary w-full">
              {loading ? <span className="spinner mr-2" /> : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            New here? <Link href="/register" className="text-brand-700 underline">Create an account</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
