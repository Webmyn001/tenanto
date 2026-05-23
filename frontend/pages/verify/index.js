import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import VerificationBadge from '../../components/VerificationBadge';
import api, { getUser, saveAuth, getToken } from '../../lib/api';
import { compressImage } from '../../lib/image';

export default function VerifyPage() {
  const [user, setUser] = useState(null);
  const [nin, setNin] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [docKind, setDocKind] = useState('student_id');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState({
    nin: false,
    email: false,
    confirm: false,
    finalize: false
  });

  useEffect(() => { setUser(getUser()); }, []);
  if (!user) return null;

  const isNinVerified = user.role === 'corper' ? !!user.corper?.ninVerified : user.role === 'landlord' ? !!user.landlord?.ninVerified : false;
  const isSchoolEmailVerified = user.role === 'student' ? !!user.student?.schoolEmailVerified : false;

  const isDocUploaded = user.role === 'student' 
    ? user.documents?.some(d => d.kind === 'student_id') 
    : user.role === 'corper' 
      ? user.documents?.some(d => d.kind === 'nysc_id') 
      : user.role === 'landlord' 
        ? user.documents?.some(d => ['utility_bill', 'ownership_doc'].includes(d.kind)) 
        : false;

  const uploadedDocs = user.documents?.filter(d => {
    if (user.role === 'student') return d.kind === 'student_id';
    if (user.role === 'corper') return d.kind === 'nysc_id';
    if (user.role === 'landlord') return ['utility_bill', 'ownership_doc'].includes(d.kind);
    return false;
  }) || [];

  const isSelfieUploaded = !!user.selfieUrl;

  const [loadingState, setLoadingState] = useState({ doc: '', selfie: '' });
  const [localDocPreview, setLocalDocPreview] = useState(null);
  const [localSelfiePreview, setLocalSelfiePreview] = useState(null);

  async function refresh() {
    const { data } = await api.get('/auth/me');
    saveAuth(getToken(), data.user);
    setUser(data.user);
  }

  async function submitNIN() {
    setMsg(''); setLoading({ ...loading, nin: true });
    try {
      await api.post('/verify/nin', { nin });
      setMsg('NIN verified ✓'); refresh();
    } catch (e) { setMsg(e?.response?.data?.error || 'NIN failed'); }
    finally { setLoading({ ...loading, nin: false }); }
  }

  async function startSchoolEmail() {
    setMsg(''); setDevCode(''); setLoading({ ...loading, email: true });
    try {
      const { data } = await api.post('/verify/school-email/start', { schoolEmail });
      setMsg('Code sent. Check your school email.');
      if (data.devCode) setDevCode(data.devCode);
    } catch (e) { setMsg(e?.response?.data?.error || 'Failed'); }
    finally { setLoading({ ...loading, email: false }); }
  }

  async function confirmSchoolEmail() {
    setMsg(''); setLoading({ ...loading, confirm: true });
    try {
      await api.post('/verify/school-email/confirm', { code: schoolCode });
      setMsg('School email verified ✓'); refresh();
    } catch (e) { setMsg(e?.response?.data?.error || 'Failed'); }
    finally { setLoading({ ...loading, confirm: false }); }
  }

  async function uploadDoc(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type.startsWith('image/')) {
      setLocalDocPreview(URL.createObjectURL(file));
    } else {
      setLocalDocPreview('pdf');
    }
    setMsg('');
    setLoadingState((prev) => ({ ...prev, doc: 'Compressing image...' }));
    try {
      const compressed = await compressImage(file, 900);
      setLoadingState((prev) => ({ ...prev, doc: 'Uploading...' }));
      const fd = new FormData();
      fd.append('file', compressed);
      const { data: up } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/verify/documents', { documents: [{ kind: docKind, url: up.url, publicId: up.publicId }] });
      setMsg(`${docKind} uploaded ✓`); refresh();
    } catch (err) { setMsg(err?.response?.data?.error || 'Upload failed'); }
    finally {
      setLoadingState((prev) => ({ ...prev, doc: '' }));
      setLocalDocPreview(null);
    }
  }

  async function uploadSelfie(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type.startsWith('image/')) {
      setLocalSelfiePreview(URL.createObjectURL(file));
    }
    setMsg('');
    setLoadingState((prev) => ({ ...prev, selfie: 'Compressing image...' }));
    try {
      const compressed = await compressImage(file, 900);
      setLoadingState((prev) => ({ ...prev, selfie: 'Uploading...' }));
      const fd = new FormData();
      fd.append('file', compressed);
      const { data: up } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/verify/documents', { selfieUrl: up.url });
      setMsg('Selfie uploaded ✓'); refresh();
    } catch (err) { setMsg(err?.response?.data?.error || 'Upload failed'); }
    finally {
      setLoadingState((prev) => ({ ...prev, selfie: '' }));
      setLocalSelfiePreview(null);
    }
  }

  async function deleteDoc(kind) {
    setMsg('');
    setLoadingState((prev) => ({ ...prev, doc: 'Deleting...' }));
    try {
      await api.post('/verify/documents', { deleteDocumentKind: kind });
      setMsg('Document removed ✓'); refresh();
    } catch (err) { setMsg(err?.response?.data?.error || 'Failed to delete'); }
    finally { setLoadingState((prev) => ({ ...prev, doc: '' })); }
  }

  async function deleteSelfie() {
    setMsg('');
    setLoadingState((prev) => ({ ...prev, selfie: 'Deleting...' }));
    try {
      await api.post('/verify/documents', { deleteSelfie: true });
      setMsg('Selfie removed ✓'); refresh();
    } catch (err) { setMsg(err?.response?.data?.error || 'Failed to delete'); }
    finally { setLoadingState((prev) => ({ ...prev, selfie: '' })); }
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
            {isNinVerified ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 p-2.5 rounded-lg border border-green-200">
                <span>✓ NIN verified</span>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-gray-600">In dev, use any 11-digit number ending in an even digit.</p>
                <input className="input mt-3" placeholder="11-digit NIN" value={nin} onChange={(e) => setNin(e.target.value)} />
                <button onClick={submitNIN} disabled={loading.nin} className="btn-primary mt-3 w-full">
                  {loading.nin ? <span className="spinner" /> : 'Verify NIN'}
                </button>
              </>
            )}
          </div>
        )}

        {user.role === 'student' && (
          <div className="card">
            <h2 className="font-semibold">Step 1 · School email (.edu.ng)</h2>
            {isSchoolEmailVerified ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 p-2.5 rounded-lg border border-green-200">
                <span>✓ School email verified</span>
              </div>
            ) : (
              <>
                <input className="input mt-3" placeholder="you@stu.school.edu.ng" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} />
                <button onClick={startSchoolEmail} disabled={loading.email} className="btn-outline mt-3 w-full">
                  {loading.email ? <span className="spinner" /> : 'Send code'}
                </button>
                {devCode && <p className="mt-2 text-xs text-gray-500">Dev code: <b>{devCode}</b></p>}
                <input className="input mt-3" placeholder="6-digit code" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} />
                <button onClick={confirmSchoolEmail} disabled={loading.confirm} className="btn-primary mt-3 w-full">
                  {loading.confirm ? <span className="spinner" /> : 'Confirm'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold">Step 2 · Documents</h2>
          <p className="mt-1 text-sm text-gray-600">Upload the documents required for your role. (Max 900KB. Images compressed automatically)</p>
          
          {loadingState.doc && (
            <div className="mt-3 flex items-center justify-center p-6 border rounded-lg bg-gray-50 border-dashed">
              <span className="spinner mr-2" /> <span className="text-sm text-gray-500">{loadingState.doc}</span>
            </div>
          )}

          {!loadingState.doc && localDocPreview && (
            <div className="mt-3 relative w-full h-40 border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              {localDocPreview === 'pdf' ? (
                <span className="text-sm font-semibold text-gray-500">📄 PDF Document</span>
              ) : (
                <img src={localDocPreview} alt="Uploading doc" className="object-cover w-full h-full" />
              )}
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white text-xs font-semibold">
                Processing...
              </div>
            </div>
          )}

          {!loadingState.doc && !localDocPreview && (
            <div className="mt-3 space-y-3">
              {uploadedDocs.map((d, i) => {
                const isPdf = d.url.toLowerCase().endsWith('.pdf');
                return (
                  <div key={i} className="relative w-full h-40 border rounded-lg overflow-hidden bg-gray-150 group">
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-4">
                        <span className="text-4xl">📄</span>
                        <span className="text-xs text-gray-600 mt-2 font-medium capitalize">{d.kind.replace('_', ' ')}</span>
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline mt-1 font-semibold">View PDF</a>
                      </div>
                    ) : (
                      <img src={d.url} alt={d.kind} className="object-cover w-full h-full" />
                    )}
                    <div className="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={() => deleteDoc(d.kind)}
                        className="p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition duration-150"
                        title="Delete document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1.5 text-xs text-white capitalize font-medium">
                      ✓ {d.kind.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loadingState.doc && !localDocPreview && uploadedDocs.length < (user.role === 'landlord' ? 2 : 1) && (
            <>
              <select className="input mt-3" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
                {user.role === 'student' && <option value="student_id">Student ID</option>}
                {user.role === 'corper' && <option value="nysc_id">NYSC ID</option>}
                {user.role === 'landlord' && (
                  <>
                    {!user.documents?.some(d => d.kind === 'utility_bill') && <option value="utility_bill">Utility bill</option>}
                    {!user.documents?.some(d => d.kind === 'ownership_doc') && <option value="ownership_doc">Property ownership doc</option>}
                  </>
                )}
              </select>
              <input type="file" accept="image/*,.pdf" onChange={uploadDoc} className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
            </>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold">Step 3 · Selfie</h2>
          <p className="mt-1 text-sm text-gray-600">A clear photo of your face — used to match your ID. (Max 900KB. Images compressed automatically)</p>

          {loadingState.selfie && (
            <div className="mt-3 flex items-center justify-center p-6 border rounded-lg bg-gray-50 border-dashed">
              <span className="spinner mr-2" /> <span className="text-sm text-gray-500">{loadingState.selfie}</span>
            </div>
          )}

          {!loadingState.selfie && localSelfiePreview && (
            <div className="mt-3 relative w-full h-40 border rounded-lg overflow-hidden bg-gray-100">
              <img src={localSelfiePreview} alt="Uploading selfie" className="object-cover w-full h-full" />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white text-xs font-semibold">
                Processing...
              </div>
            </div>
          )}

          {!loadingState.selfie && !localSelfiePreview && isSelfieUploaded && (
            <div className="mt-3 relative w-full h-40 border rounded-lg overflow-hidden bg-gray-150 group">
              <img src={user.selfieUrl} alt="Selfie" className="object-cover w-full h-full" />
              <div className="absolute top-2 right-2">
                <button
                  type="button"
                  onClick={deleteSelfie}
                  className="p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition duration-150"
                  title="Delete selfie"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1.5 text-xs text-white font-medium">
                ✓ Selfie uploaded
              </div>
            </div>
          )}

          {!loadingState.selfie && !localSelfiePreview && !isSelfieUploaded && (
            <input type="file" accept="image/*" capture="user" onChange={uploadSelfie} className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-semibold">Submit for review</h3>
        <p className="mt-1 text-sm text-gray-600">
          Once you've uploaded all required documents, click the button below.
          An admin will review your application within 24 hours.
        </p>
        <button
          onClick={async () => {
            setMsg(''); setLoading({ ...loading, finalize: true });
            try {
              await api.post('/verify/documents', { finalize: true });
              setMsg('Verification submitted for review ✓'); refresh();
            } catch (e) { setMsg(e?.response?.data?.error || 'Submission failed'); }
            finally { setLoading({ ...loading, finalize: false }); }
          }}
          disabled={user.verificationStatus !== 'pending' || loading.finalize}
          className="btn-primary mt-4 w-full"
        >
          {loading.finalize ? <span className="spinner" /> : (user.verificationStatus === 'submitted' ? 'Waiting for review...' : 'Submit for review')}
        </button>
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
