import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import VerificationBadge from '../../components/VerificationBadge';
import api, { getUser, saveAuth, getToken } from '../../lib/api';

export default function VerifyPage() {
  const [user, setUser] = useState(null);
  const [nin, setNin] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [docKind, setDocKind] = useState('student_id');
  const [msg, setMsg] = useState('');

  useEffect(() => { setUser(getUser()); }, []);
  if (!user) return null;

  async function refresh() {
    const { data } = await api.get('/auth/me');
    saveAuth(getToken(), data.user);
    setUser(data.user);
  }

  async function submitNIN() {
    setMsg('');
    try {
      await api.post('/verify/nin', { nin });
      setMsg('NIN verified ✓'); refresh();
    } catch (e) { setMsg(e?.response?.data?.error || 'NIN failed'); }
  }

  async function startSchoolEmail() {
    setMsg(''); setDevCode('');
    try {
      const { data } = await api.post('/verify/school-email/start', { schoolEmail });
      setMsg('Code sent. Check your school email.');
      if (data.devCode) setDevCode(data.devCode);
    } catch (e) { setMsg(e?.response?.data?.error || 'Failed'); }
  }

  async function confirmSchoolEmail() {
    try {
      await api.post('/verify/school-email/confirm', { code: schoolCode });
      setMsg('School email verified ✓'); refresh();
    } catch (e) { setMsg(e?.response?.data?.error || 'Failed'); }
  }

  async function uploadDoc(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data: up } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/verify/documents', { documents: [{ kind: docKind, url: up.url, publicId: up.publicId }] });
      setMsg(`${docKind} uploaded ✓`); refresh();
    } catch (err) { setMsg(err?.response?.data?.error || 'Upload failed'); }
  }

  async function uploadSelfie(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data: up } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/verify/documents', { selfieUrl: up.url });
      setMsg('Selfie uploaded ✓'); refresh();
    } catch (err) { setMsg(err?.response?.data?.error || 'Upload failed'); }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Verification</h1>
        <VerificationBadge user={user} />
      </div>

      {msg && <div className="card mb-4 border-brand-200 bg-brand-50 text-sm text-brand-800">{msg}</div>}

      <div className="grid gap-6 md:grid-cols-2">
        {(user.role === 'corper' || user.role === 'landlord') && (
          <div className="card">
            <h2 className="font-semibold">Step 1 · NIN verification</h2>
            <p className="mt-1 text-sm text-gray-600">In dev, use any 11-digit number ending in an even digit.</p>
            <input className="input mt-3" placeholder="11-digit NIN" value={nin} onChange={(e) => setNin(e.target.value)} />
            <button onClick={submitNIN} className="btn-primary mt-3">Verify NIN</button>
          </div>
        )}

        {user.role === 'student' && (
          <div className="card">
            <h2 className="font-semibold">Step 1 · School email (.edu.ng)</h2>
            <input className="input mt-3" placeholder="you@stu.school.edu.ng" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} />
            <button onClick={startSchoolEmail} className="btn-outline mt-3">Send code</button>
            {devCode && <p className="mt-2 text-xs text-gray-500">Dev code: <b>{devCode}</b></p>}
            <input className="input mt-3" placeholder="6-digit code" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} />
            <button onClick={confirmSchoolEmail} className="btn-primary mt-3">Confirm</button>
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold">Step 2 · Documents</h2>
          <p className="mt-1 text-sm text-gray-600">Upload the documents required for your role.</p>
          <select className="input mt-3" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
            {user.role === 'student' && <option value="student_id">Student ID</option>}
            {user.role === 'corper' && <option value="nysc_id">NYSC ID</option>}
            {user.role === 'landlord' && (
              <>
                <option value="utility_bill">Utility bill</option>
                <option value="ownership_doc">Property ownership doc</option>
              </>
            )}
          </select>
          <input type="file" accept="image/*,.pdf" onChange={uploadDoc} className="mt-3 block w-full text-sm" />
        </div>

        <div className="card">
          <h2 className="font-semibold">Step 3 · Selfie</h2>
          <p className="mt-1 text-sm text-gray-600">A clear photo of your face — used to match your ID.</p>
          <input type="file" accept="image/*" capture="user" onChange={uploadSelfie} className="mt-3 block w-full text-sm" />
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-semibold">What happens next</h3>
        <p className="mt-1 text-sm text-gray-600">
          Once you've submitted everything, an admin reviews your documents (usually within 24 h).
          You'll get an email when you're approved. Until then you can browse listings but can't
          book inspections or pay.
        </p>
      </div>
    </Layout>
  );
}
