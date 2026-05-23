import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import SchoolSelect from '../components/SchoolSelect';
import StateSelect from '../components/StateSelect';
import api, { saveAuth } from '../lib/api';

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
    schoolName: '', schoolEmail: '', department: '', matricNumber: '',
    stateCode: '', stateOfService: '',
    acceptTerms: false,
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const getProgressPercentage = () => {
    const fields = ['fullName', 'email', 'phone', 'password'];
    if (role === 'student') {
      fields.push('schoolName', 'schoolEmail', 'department', 'matricNumber');
    } else if (role === 'corper') {
      fields.push('stateCode', 'stateOfService');
    }
    const completed = fields.filter((f) => !!form[f]).length;
    return Math.round((completed / fields.length) * 100);
  };
  const progress = getProgressPercentage();

  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, role });
      // We don't saveAuth yet because they need to verify email first to fully "log in"
      // saveAuth(data.token, data.user); 
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
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

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-1">
              <span>REGISTRATION PROGRESS</span>
              <span className="text-brand-600">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-600 transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
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
                  <StateSelect value={form.stateOfService} onChange={(v) => setForm({ ...form, stateOfService: v })} required /></div>
              </>
            )}

            <div className="md:col-span-2 flex items-start gap-2">
              <input
                type="checkbox"
                id="acceptTerms"
                className="mt-1"
                required
                checked={form.acceptTerms}
                onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                I accept the <Link href="/legal/terms" className="text-brand-700 underline">Terms of Service</Link> and <Link href="/legal/privacy" className="text-brand-700 underline">Privacy Policy</Link>.
              </label>
            </div>

            {err && <p className="md:col-span-2 text-sm text-red-600">{err}</p>}
            
            <p className="md:col-span-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
              💡 <b>Note:</b> Once your verification is approved by an admin, your profile details will be locked to read-only. Any subsequent updates will require contacting the admin.
            </p>

            <button disabled={loading} className="btn-primary md:col-span-2">
              {loading ? <span className="spinner mr-2" /> : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account? <Link href="/login" className="text-brand-700 underline">Sign in</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
