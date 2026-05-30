import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import SchoolSelect from '../components/SchoolSelect';
import DepartmentSelect from '../components/DepartmentSelect';
import StateSelect from '../components/StateSelect';
import BankSelect from '../components/BankSelect';
import api, { saveAuth } from '../lib/api';
import { validatePhone, validateStateCode, formatStateCode } from '../lib/validation';

const FIELD_ERR_INIT = {};
export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    schoolName: '', schoolEmail: '', department: '', matricNumber: '',
    stateCode: '', stateOfService: '',
    acceptTerms: false,
    bankCode: '', bankName: '', accountNumber: '', accountName: '',
  });
  const [fieldErr, setFieldErr] = useState({});
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  const toastRef = useRef(null);
  const [banks, setBanks] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);
  useEffect(() => { api.get('/lookup/schools').then(({ data }) => setSchools(data.schools)).catch(() => {}); }, []);
  useEffect(() => { api.get('/verify/banks').then(({ data }) => setBanks(data.banks)).catch(() => {}); }, []);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToastMsg({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => { setToastMsg(null); toastRef.current = null; }, 4000);
  }

  const getProgressPercentage = () => {
    const fields = ['fullName', 'email', 'phone', 'password'];
    if (role === 'student') {
      fields.push('schoolName', 'schoolEmail', 'department', 'matricNumber');
    } else if (role === 'corper') {
      fields.push('stateCode', 'stateOfService');
    } else if (role === 'landlord') {
      fields.push('bankCode', 'accountNumber');
    }
    const completed = fields.filter((f) => !!form[f]).length;
    return Math.round((completed / fields.length) * 100);
  };
  const progress = getProgressPercentage();

  function validate() {
    const errs = {};
    const phoneVal = validatePhone(form.phone);
    if (!phoneVal.ok) errs.phone = phoneVal.msg;
    if (role === 'corper') {
      const codeVal = validateStateCode(form.stateCode);
      if (!codeVal.ok) errs.stateCode = codeVal.msg;
    }
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    if (!validate()) { setLoading(false); return; }
    try {
      const payload = { ...form, role };
      if (role !== 'landlord') {
        delete payload.bankCode; delete payload.bankName; delete payload.accountNumber; delete payload.accountName;
      }
      const { data } = await api.post('/auth/register', payload);
      showToast('Account created successfully! Check your email for the verification code.', 'success');
      setTimeout(() => router.push(`/verify-email?email=${encodeURIComponent(form.email)}`), 1500);
    } catch (e) {
      showToast(e?.response?.data?.error || 'Registration failed');
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

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
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

          {toastMsg && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] animate-slide-down">
              <div className={`rounded-xl text-white px-5 py-3.5 text-sm font-medium shadow-xl flex items-center gap-2.5 ${toastMsg.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                {toastMsg.type === 'success' ? (
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="flex-1">{toastMsg.msg}</span>
                <button type="button" onClick={() => setToastMsg(null)} className="shrink-0 hover:bg-white/20 rounded-lg p-1 -mr-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><label className="label">Full name</label>
              <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><label className="label">Email</label>
              <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Phone</label>
              <input className={`input ${fieldErr.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`} placeholder="e.g. 08031234567" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (fieldErr.phone) setFieldErr({ ...fieldErr, phone: '' }); }} />
              {fieldErr.phone && <p className="mt-1 text-xs text-red-600">{fieldErr.phone}</p>}</div>
            <div className="md:col-span-2"><label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1" tabIndex={-1}>
                  {showPw ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div></div>
            <div className="md:col-span-2"><label className="label">Confirm Password</label>
              <div className="relative">
                <input type={showCp ? 'text' : 'password'} className={`input pr-10 ${fieldErr.confirmPassword ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`} required minLength={8} value={form.confirmPassword} onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); if (fieldErr.confirmPassword) setFieldErr({ ...fieldErr, confirmPassword: '' }); }} />
                <button type="button" onClick={() => setShowCp(!showCp)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1" tabIndex={-1}>
                  {showCp ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
                {fieldErr.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErr.confirmPassword}</p>}
              </div></div>

            {role === 'student' && (
              <>
                <div className="md:col-span-2"><label className="label">School</label>
                  <SchoolSelect value={form.schoolName} onChange={(v) => setForm({ ...form, schoolName: v })} required /></div>
                <div><label className="label">School email (.edu.ng)</label>
                  <input className="input" placeholder="you@stu.school.edu.ng" value={form.schoolEmail} onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, schoolEmail: v });
                    if (v.includes('@') && form.schoolName) {
                      const domain = v.split('@')[1]?.toLowerCase();
                      if (domain) {
                        const school = schools.find((s) => s.name === form.schoolName);
                        if (school && school.domains.length > 0 && !school.domains.includes(domain)) {
                          showToast('This email domain does not match the selected school. Use your official school email (e.g. @' + school.domains[0] + ')', 'error');
                        }
                      }
                    }
                  }} /></div>
                <div><label className="label">Department</label>
                  <DepartmentSelect value={form.department} onChange={(v) => setForm({ ...form, department: v })} required /></div>
                <div className="md:col-span-2"><label className="label">Matric number</label>
                  <input className="input" value={form.matricNumber} onChange={(e) => setForm({ ...form, matricNumber: e.target.value })} /></div>
              </>
            )}
            {role === 'corper' && (
              <>
                <div><label className="label">State code</label>
                  <input className={`input ${fieldErr.stateCode ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`} placeholder="e.g. OY/24A/1234" value={form.stateCode} onChange={(e) => { const v = formatStateCode(e.target.value); setForm({ ...form, stateCode: v }); if (fieldErr.stateCode) setFieldErr({ ...fieldErr, stateCode: '' }); }} />
                  {fieldErr.stateCode && <p className="mt-1 text-xs text-red-600">{fieldErr.stateCode}</p>}</div>
                <div><label className="label">State of service</label>
                  <StateSelect value={form.stateOfService} onChange={(v) => setForm({ ...form, stateOfService: v })} required /></div>
              </>
            )}

            {role === 'landlord' && (
              <>
                <h3 className="md:col-span-2 font-semibold text-base mt-2 mb-1">Payout Bank Account</h3>
                <div><label className="label">Bank name</label>
                  <BankSelect value={form.bankCode} onChange={(v) => {
                    const bank = banks.find(b => b.code === v);
                    setForm({ ...form, bankCode: v, bankName: bank?.name || '' });
                  }} required /></div>
                <div><label className="label">Account number</label>
                  <input className="input" placeholder="e.g. 0123456789" maxLength={10} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '') })} required /></div>
                <div><label className="label">Account name</label>
                  <input className="input" placeholder="e.g. Patrick Stone" value={form.accountName || ''} onChange={(e) => setForm({ ...form, accountName: e.target.value })} required /></div>
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
