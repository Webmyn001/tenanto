import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import SchoolSelect from '../components/SchoolSelect';
import DepartmentSelect from '../components/DepartmentSelect';
import StateSelect from '../components/StateSelect';
import api, { getUser, saveAuth, getToken } from '../lib/api';
import { validatePhone, validateStateCode, formatStateCode } from '../lib/validation';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    schoolName: '',
    department: '',
    matricNumber: '',
    stateCode: '',
    stateOfService: '',
  });
  const [fieldErr, setFieldErr] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    const u = getUser();
    if (u) {
      setUser(u);
      setForm({
        fullName: u.fullName || '',
        phone: u.phone || '',
        schoolName: u.student?.schoolName || '',
        department: u.student?.department || '',
        matricNumber: u.student?.matricNumber || '',
        stateCode: u.corper?.stateCode || '',
        stateOfService: u.corper?.stateOfService || '',
      });
    }
  }, []);

  if (!user) {
    return (
      <Layout>
        <div className="card text-center p-8">
          <p className="text-gray-500">Please sign in to view settings.</p>
        </div>
      </Layout>
    );
  }

  const isApproved = user.verificationStatus === 'approved' || user.verificationStatus === 'submitted';

  function validate() {
    const errs = {};
    const phoneVal = validatePhone(form.phone);
    if (!phoneVal.ok) errs.phone = phoneVal.msg;
    if (user.role === 'corper') {
      const codeVal = validateStateCode(form.stateCode);
      if (!codeVal.ok) errs.stateCode = codeVal.msg;
    }
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (isApproved) return;
    if (!form.fullName) return showToast('Full name is required', 'error');
    if (!validate()) return;
    setLoading(true);

    const payload = {
      fullName: form.fullName,
      phone: form.phone,
    };

    if (user.role === 'student') {
      payload.student = {
        schoolName: form.schoolName,
        department: form.department,
        matricNumber: form.matricNumber,
      };
    } else if (user.role === 'corper') {
      payload.corper = {
        stateCode: form.stateCode,
        stateOfService: form.stateOfService,
      };
    }

    try {
      const { data } = await api.put('/auth/profile', payload);
      const meRes = await api.get('/auth/me');
      saveAuth(getToken(), meRes.data.user);
      setUser(meRes.data.user);
      showToast('Profile updated successfully ✓', 'success');
    } catch (e) {
      showToast(e?.response?.data?.error || 'Profile update failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Profile settings</h1>
        <p className="text-sm text-gray-600 mb-6">Manage your account information and preferences.</p>

        {isApproved && (
          <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm flex items-start gap-3">
            <span className="text-lg">🔒</span>
            <div>
              <p className="font-semibold">Profile details locked</p>
              <p className="mt-0.5 text-blue-700">
                {user.verificationStatus === 'submitted'
                  ? 'Your verification is under review. Edits to your core profile details are temporarily disabled. Please contact support at '
                  : 'To prevent identity mismatch, edits to your core profile details are disabled. Please contact support at '}
                <a href="mailto:support@tenanto.local" className="underline font-medium">support@tenanto.local</a>
                {user.verificationStatus === 'submitted' ? ' if you need to make changes.' : ' if you need to modify your information.'}
              </p>
            </div>
          </div>
        )}

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

        <div className="card mb-6">
          <h2 className="font-semibold mb-4 text-base">Personal Photo</h2>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
              {user.selfieUrl ? (
                <img src={user.selfieUrl} alt="Avatar" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 capitalize">
                {user.role} Profile Photo
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {user.selfieUrl 
                  ? 'This selfie matches your uploaded identification document.' 
                  : 'You have not uploaded a selfie yet. Visit the verification tab to upload.'
                }
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="card grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold text-base mb-1">General Details</h2>
          
          <div>
            <label className="label">Full name</label>
            <input 
              className="input" 
              value={form.fullName} 
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} 
              disabled={isApproved} 
              required
            />
          </div>

          <div>
            <label className="label">Email address</label>
            <input 
              type="email" 
              className="input bg-gray-50 text-gray-500 cursor-not-allowed" 
              value={user.email} 
              disabled 
              readOnly 
            />
          </div>

          <div>
            <label className="label">Phone number</label>
            <input 
              className={`input ${fieldErr.phone && !isApproved ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
              placeholder="e.g. 08031234567" 
              value={form.phone} 
              onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (fieldErr.phone) setFieldErr({ ...fieldErr, phone: '' }); }} 
              disabled={isApproved}
            />
            {fieldErr.phone && !isApproved && <p className="mt-1 text-xs text-red-600">{fieldErr.phone}</p>}
          </div>

          <div>
            <label className="label">Account role</label>
            <input 
              className="input bg-gray-50 text-gray-500 capitalize cursor-not-allowed" 
              value={user.role} 
              disabled 
              readOnly 
            />
          </div>

          {user.role === 'student' && (
            <>
              <h2 className="md:col-span-2 font-semibold text-base mt-2 mb-1">Student Particulars</h2>
              
              <div className="md:col-span-2">
                <label className="label">School name</label>
                {isApproved ? (
                  <input className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={form.schoolName} disabled readOnly />
                ) : (
                  <SchoolSelect value={form.schoolName} onChange={(v) => setForm({ ...form, schoolName: v })} required />
                )}
              </div>

              <div>
                <label className="label">School email (.edu.ng)</label>
                <input 
                  className="input bg-gray-50 text-gray-500 cursor-not-allowed" 
                  value={user.student?.schoolEmail || 'Not verified'} 
                  disabled 
                  readOnly 
                />
              </div>

              <div>
                <label className="label">Department</label>
                {isApproved ? (
                  <input className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={form.department} disabled readOnly />
                ) : (
                  <DepartmentSelect value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="label">Matric number</label>
                <input 
                  className="input" 
                  value={form.matricNumber} 
                  onChange={(e) => setForm({ ...form, matricNumber: e.target.value })} 
                  disabled={isApproved}
                />
              </div>
            </>
          )}

          {user.role === 'corper' && (
            <>
              <h2 className="md:col-span-2 font-semibold text-base mt-2 mb-1">NYSC Service Particulars</h2>

              <div>
                <label className="label">State code</label>
                <input 
                  className={`input ${fieldErr.stateCode && !isApproved ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                  placeholder="e.g. OY/24A/1234" 
                  value={form.stateCode} 
                  onChange={(e) => { const v = formatStateCode(e.target.value); setForm({ ...form, stateCode: v }); if (fieldErr.stateCode) setFieldErr({ ...fieldErr, stateCode: '' }); }} 
                  disabled={isApproved}
                />
                {fieldErr.stateCode && !isApproved && <p className="mt-1 text-xs text-red-600">{fieldErr.stateCode}</p>}
              </div>

              <div>
                <label className="label">State of service</label>
                {isApproved ? (
                  <input className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={form.stateOfService} disabled readOnly />
                ) : (
                  <StateSelect value={form.stateOfService} onChange={(v) => setForm({ ...form, stateOfService: v })} required />
                )}
              </div>
            </>
          )}

          {user.role === 'landlord' && user.landlord?.accountNumber && (
            <>
              <h2 className="md:col-span-2 font-semibold text-base mt-2 mb-1">Verified Escrow Bank Account</h2>

              <div>
                <label className="label">Bank name</label>
                <input className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={user.landlord.bankName || ''} disabled readOnly />
              </div>

              <div>
                <label className="label">Account number</label>
                <input className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={user.landlord.accountNumber || ''} disabled readOnly />
              </div>

              <div className="md:col-span-2">
                <label className="label">Account name</label>
                <input className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={user.landlord.accountName || ''} disabled readOnly />
              </div>
            </>
          )}

          {!isApproved && (
            <button disabled={loading} className="btn-primary md:col-span-2 mt-2">
              {loading ? <span className="spinner mr-2" /> : 'Save changes'}
            </button>
          )}
        </form>
      </div>
    </Layout>
  );
}
