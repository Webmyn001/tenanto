import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import SchoolSelect from '../components/SchoolSelect';
import api, { saveAuth } from '../lib/api';

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
    schoolName: '', schoolEmail: '', department: '', matricNumber: '',
    stateCode: '', stateOfService: '',
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, role });
      saveAuth(data.token, data.user);
      router.push('/verify');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  }

  const roles = [
    { id: 'student', label: 'I\'m a student' },
    { id: 'corper', label: 'I\'m a corper (NYSC)' },
    { id: 'landlord', label: 'I have a property to let' },
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <div className="card">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-gray-600">It takes 2 minutes. Verification is the next step.</p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  role === r.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><label className="label">Full name</label>
              <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><label className="label">Email</label>
              <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="md:col-span-2"><label className="label">Password</label>
              <input type="password" className="input" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>

            {role === 'student' && (
              <>
                <div className="md:col-span-2"><label className="label">School</label>
                  <SchoolSelect value={form.schoolName} onChange={(v) => setForm({ ...form, schoolName: v })} required /></div>
                <div><label className="label">School email (.edu.ng)</label>
                  <input className="input" placeholder="you@stu.school.edu.ng" value={form.schoolEmail} onChange={(e) => setForm({ ...form, schoolEmail: e.target.value })} /></div>
                <div><label className="label">Department</label>
                  <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                <div className="md:col-span-2"><label className="label">Matric number</label>
                  <input className="input" value={form.matricNumber} onChange={(e) => setForm({ ...form, matricNumber: e.target.value })} /></div>
              </>
            )}
            {role === 'corper' && (
              <>
                <div><label className="label">State code</label>
                  <input className="input" placeholder="e.g. OY/24A/1234" value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} /></div>
                <div><label className="label">State of service</label>
                  <input className="input" value={form.stateOfService} onChange={(e) => setForm({ ...form, stateOfService: e.target.value })} /></div>
              </>
            )}

            {err && <p className="md:col-span-2 text-sm text-red-600">{err}</p>}
            <button disabled={loading} className="btn-primary md:col-span-2">{loading ? '…' : 'Create account'}</button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account? <Link href="/login" className="text-brand-700 underline">Sign in</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
