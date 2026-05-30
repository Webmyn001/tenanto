import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import api, { saveAuth } from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const [showPw, setShowPw] = useState(false);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    if (!form.email || !form.password) { showToast('Please fill in all fields', 'error'); setLoading(false); return; }
    try {
      const { data } = await api.post('/auth/login', form);
      saveAuth(data.token, data.user);
      if (data.user.role !== 'admin' && data.user.verificationStatus !== 'approved') {
        router.push('/verify');
        return;
      }
      const dash = data.user.role === 'admin' ? '/dashboard/admin'
                 : data.user.role === 'landlord' ? '/dashboard/landlord'
                 : '/dashboard/tenant';
      router.push(dash);
    } catch (e) {
      if (e?.response?.data?.unverified) {
        return router.push(`/verify-email?email=${encodeURIComponent(e.response.data.email || form.email)}`);
      }
      showToast(e?.response?.data?.error || 'Login failed', 'error');
    } finally { setLoading(false); }
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
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1" tabIndex={-1}>
                  {showPw ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
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
