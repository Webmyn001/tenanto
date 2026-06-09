import { useEffect, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import VerificationBadge from '../../components/VerificationBadge';
import api, { getUser, saveAuth, getToken } from '../../lib/api';
import { compressImage } from '../../lib/image';
import { validateNIN } from '../../lib/validation';
import { formatPriceInput } from '../../lib/format';

const STEPS = [
  { id: 1, label: 'Verify Identity' },
  { id: 2, label: 'Upload Selfie' },
  { id: 3, label: 'Upload Documents' },
  { id: 4, label: 'Review & Submit' },
];

export default function VerifyPage() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [nin, setNin] = useState('');
  const [bvn, setBvn] = useState('');

  const [docKind, setDocKind] = useState('');
  const [loading, setLoading] = useState({
    nin: false,
    bvn: false,
    finalize: false
  });
  const [loadingState, setLoadingState] = useState({ doc: '', selfie: '' });
  const [localDocPreview, setLocalDocPreview] = useState(null);
  const [localSelfiePreview, setLocalSelfiePreview] = useState(null);
  const [ninErr, setNinErr] = useState('');
  const [bvnErr, setBvnErr] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [toast, setToast] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const toastRef = useRef(null);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'success' });
    toastRef.current = setTimeout(() => { setToast(null); toastRef.current = null; }, 5000);
  }

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) {
      if (u.role === 'student') setDocKind('student_id');
      else if (u.role === 'corper') setDocKind('nysc_id');
      else if (u.role === 'landlord') setDocKind('utility_bill');
      if (u.verificationStatus === 'submitted' || u.verificationStatus === 'approved') {
        if (u.verificationStatus === 'approved') setStep(5);
        else setStep(4);
      } else {
        const ninVerified = u.role === 'student' ? u.student?.ninVerified : u.role === 'corper' ? u.corper?.ninVerified : u.landlord?.ninVerified;
        if (ninVerified) setStep(s => Math.max(s, 2));
        if (u.selfieUrl) setStep(s => Math.max(s, 3));
        if (u.documents?.length > 0) setStep(s => Math.max(s, 4));
      }
      if (u.role === 'student' || u.role === 'corper') {
        api.get('/roommates/profile').then(({ data }) => {
          if (data.profile) {
            if (data.profile.budgetMin) setBudgetMin(String(data.profile.budgetMin));
            if (data.profile.budgetMax) setBudgetMax(String(data.profile.budgetMax));
          }
        }).catch(() => {});
      }
    }
  }, []);

  if (!user) return <Layout><div className="flex min-h-[50vh] items-center justify-center"><span className="spinner h-8 w-8 text-brand-600" /></div></Layout>;

  const isSubmitting = user.verificationStatus === 'submitted';
  const isApproved = user.verificationStatus === 'approved';
  const isLocked = isSubmitting || isApproved;

  const isNinVerified = user.role === 'student' ? !!user.student?.ninVerified : user.role === 'corper' ? !!user.corper?.ninVerified : !!user.landlord?.ninVerified;
  const isBvnVerified = user.role === 'landlord' ? !!user.landlord?.bvnVerified : false;
  const isSelfieUploaded = !!user.selfieUrl;

  const uploadedDocs = user.documents?.filter(d => {
    if (user.role === 'student') return d.kind === 'student_id';
    if (user.role === 'corper') return d.kind === 'nysc_id';
    if (user.role === 'landlord') return ['utility_bill', 'ownership_doc'].includes(d.kind);
    return false;
  }) || [];

  const docsComplete = user.role === 'student'
    ? uploadedDocs.some(d => d.kind === 'student_id')
    : user.role === 'corper'
      ? uploadedDocs.some(d => d.kind === 'nysc_id')
      : user.role === 'landlord'
        ? uploadedDocs.length >= 2
        : false;

  const identityComplete = user.role === 'landlord' ? (isNinVerified && isBvnVerified) : isNinVerified;

  async function refresh() {
    const { data } = await api.get('/auth/me');
    saveAuth(getToken(), data.user);
    setUser(data.user);
  }

  async function submitNIN() {
    const check = validateNIN(nin);
    if (!check.ok) { setNinErr(check.msg); return; }
    setNinErr('');
    setLoading({ ...loading, nin: true });
    try {
      await api.post('/verify/nin', { nin });
      showToast('NIN verified successfully', 'success');
      refresh();
    } catch (e) { showToast(e?.response?.data?.error || 'NIN verification failed', 'error'); }
    finally { setLoading({ ...loading, nin: false }); }
  }

  async function submitBVN() {
    if (!/^\d{11}$/.test(bvn)) { setBvnErr('BVN must be 11 digits'); return; }
    setBvnErr('');
    setLoading({ ...loading, bvn: true });
    try {
      await api.post('/verify/bvn', { bvn });
      showToast('BVN verified successfully', 'success');
      refresh();
    } catch (e) { showToast(e?.response?.data?.error || 'BVN verification failed', 'error'); }
    finally { setLoading({ ...loading, bvn: false }); }
  }

  async function uploadDoc(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type.startsWith('image/')) {
      setLocalDocPreview(URL.createObjectURL(file));
    } else {
      setLocalDocPreview('pdf');
    }
    setLoadingState((prev) => ({ ...prev, doc: 'Compressing image...' }));
    try {
      const compressed = await compressImage(file, 900);
      setLoadingState((prev) => ({ ...prev, doc: 'Uploading...' }));
      const fd = new FormData();
      fd.append('file', compressed);
      const { data: up } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/verify/documents', { documents: [{ kind: docKind, url: up.url, publicId: up.publicId }] });
      showToast('Document uploaded ✓', 'success');
      refresh();
    } catch (err) { showToast(err?.response?.data?.error || 'Upload failed', 'error'); }
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
    setLoadingState((prev) => ({ ...prev, selfie: 'Compressing image...' }));
    try {
      const compressed = await compressImage(file, 900);
      setLoadingState((prev) => ({ ...prev, selfie: 'Uploading...' }));
      const fd = new FormData();
      fd.append('file', compressed);
      const { data: up } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/verify/documents', { selfieUrl: up.url });
      showToast('Selfie uploaded ✓', 'success');
      refresh();
    } catch (err) { showToast(err?.response?.data?.error || 'Upload failed', 'error'); }
    finally {
      setLoadingState((prev) => ({ ...prev, selfie: '' }));
      setLocalSelfiePreview(null);
    }
  }

  async function deleteDoc(kind) {
    setLoadingState((prev) => ({ ...prev, doc: 'Deleting...' }));
    try {
      await api.post('/verify/documents', { deleteDocumentKind: kind });
      showToast('Document removed', 'success');
      refresh();
    } catch (err) { showToast(err?.response?.data?.error || 'Failed to delete', 'error'); }
    finally { setLoadingState((prev) => ({ ...prev, doc: '' })); }
  }

  async function deleteSelfie() {
    setLoadingState((prev) => ({ ...prev, selfie: 'Deleting...' }));
    try {
      await api.post('/verify/documents', { deleteSelfie: true });
      showToast('Selfie removed', 'success');
      refresh();
    } catch (err) { showToast(err?.response?.data?.error || 'Failed to delete', 'error'); }
    finally { setLoadingState((prev) => ({ ...prev, selfie: '' })); }
  }

  async function handleSubmit() {
    setLoading({ ...loading, finalize: true });
    try {
      if (budgetMin && budgetMax) {
        const strip = (v) => Number(String(v).replace(/,/g, ''));
        await api.post('/roommates/profile', { budgetMin: strip(budgetMin), budgetMax: strip(budgetMax) });
      }
      await api.post('/verify/documents', { finalize: true });
      setShowConfetti(true);
      showToast('Your verification has been submitted. You will receive an email once an admin approves your account.', 'success');
      refresh();
      setTimeout(() => setShowConfetti(false), 4000);
    } catch (e) { showToast(e?.response?.data?.error || 'Submission failed', 'error'); }
    finally { setLoading({ ...loading, finalize: false }); setConfirming(false); }
  }

  // ─── Confetti ──────────────────────────────────────────────────────
  function ConfettiOverlay() {
    if (!showConfetti) return null;
    const colors = ['#f88a07', '#0f635c', '#ffdb89', '#249a8e', '#ffc14b'];
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 2,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    }));
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {pieces.map(p => (
          <div key={p.id}
            className="absolute animate-confetti"
            style={{
              left: `${p.left}%`,
              top: '-10px',
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: '2px',
              transform: `rotate(${p.rotate}deg)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
    );
  }

  // ─── Step indicator ────────────────────────────────────────────────
  function StepIndicator() {
    const displaySteps = isApproved ? [...STEPS, { id: 5, label: 'Approved' }] : STEPS;
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between gap-0 sm:gap-2">
          {displaySteps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
                  step > s.id || (isApproved && s.id === 5)
                    ? 'bg-green-500 text-white'
                    : step === s.id
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.id || (isApproved && s.id === 5) ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>
                <span className={`mt-1 text-[10px] leading-tight text-center sm:text-xs sm:mt-1.5 sm:font-medium ${
                  step === s.id ? 'text-brand-700' : step > s.id || (isApproved && s.id === 5) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {isApproved && s.id === 5 ? '✓ Approved' : s.label}
                </span>
              </div>
              {i < displaySteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 sm:mx-2 mt-[-1.5rem] ${
                  step > s.id || (isApproved && s.id < 5) ? 'bg-green-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Toast ─────────────────────────────────────────────────────────
  function ToastBar() {
    if (!toast) return null;
    const isErr = toast.type === 'error';
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] animate-slide-down">
        <div className={`rounded-xl px-5 py-3.5 text-sm font-medium shadow-xl flex items-center gap-2.5 ${
          isErr ? 'bg-red-600 text-white' : 'bg-brand-700 text-white'
        }`}>
          {isErr ? (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="flex-1">{toast.msg}</span>
          <button type="button" onClick={() => setToast(null)} className="shrink-0 hover:bg-white/20 rounded-lg p-1 -mr-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 1: Identity ──────────────────────────────────────────────
  function Step1Identity() {
    if (isLocked && identityComplete) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700">
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">NIN verified — {isApproved ? 'Approved' : 'Submitted for review'}</span>
          </div>
          {user.role === 'landlord' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">BVN verified — {isApproved ? 'Approved' : 'Submitted for review'}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* NIN — all roles */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">1a</span>
            <h2 className="font-semibold">NIN Verification</h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">Enter your 11-digit National Identification Number.</p>
          {isNinVerified ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">NIN verified</span>
            </div>
          ) : (
            <>
              <input className={`input ${ninErr ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`} placeholder="11-digit NIN" maxLength={11} value={nin} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setNin(v); if (ninErr) setNinErr(''); }} />
              {ninErr && <p className="mt-1 text-xs text-red-600">{ninErr}</p>}
              <button onClick={submitNIN} disabled={loading.nin || nin.length !== 11} className="btn-primary mt-3 w-full">
                {loading.nin ? <span className="spinner" /> : 'Verify NIN'}
              </button>
            </>
          )}
        </div>

        {/* BVN — landlords only */}
        {user.role === 'landlord' && (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">1b</span>
              <h2 className="font-semibold">BVN Verification</h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">Enter your 11-digit Bank Verification Number.</p>
            {isBvnVerified ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">BVN verified</span>
              </div>
            ) : (
              <>
                <input className={`input ${bvnErr ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`} placeholder="11-digit BVN" maxLength={11} value={bvn} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setBvn(v); if (bvnErr) setBvnErr(''); }} />
                {bvnErr && <p className="mt-1 text-xs text-red-600">{bvnErr}</p>}
                <button onClick={submitBVN} disabled={loading.bvn || bvn.length !== 11} className="btn-primary mt-3 w-full">
                  {loading.bvn ? <span className="spinner" /> : 'Verify BVN'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Step 2: Selfie ────────────────────────────────────────────────
  function Step2Selfie() {
    if (isLocked && isSelfieUploaded) {
      return (
        <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-green-300">
          <img src={user.selfieUrl} alt="Selfie" loading="lazy" className="object-cover w-full h-full" />
          <div className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-xs font-medium text-center py-1.5">
            {isApproved ? '✓ Selfie approved' : '✓ Selfie submitted'}
          </div>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="font-semibold">Upload Selfie</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">A clear photo of your face — used to match your ID. (Max 900KB. Images compressed automatically)</p>

        {loadingState.selfie && (
          <div className="flex items-center justify-center p-6 border rounded-lg bg-gray-50 border-dashed">
            <span className="spinner mr-2" /> <span className="text-sm text-gray-500">{loadingState.selfie}</span>
          </div>
        )}

        {!loadingState.selfie && localSelfiePreview && (
          <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-gray-100">
            <img src={localSelfiePreview} alt="Uploading selfie" loading="lazy" className="object-cover w-full h-full" />
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white text-xs font-semibold">
              Processing...
            </div>
          </div>
        )}

        {!loadingState.selfie && !localSelfiePreview && isSelfieUploaded && (
          <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-green-300 group">
            <img src={user.selfieUrl} alt="Selfie" loading="lazy" className="object-cover w-full h-full" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1.5 text-xs text-white font-medium text-center">
              ✓ Selfie uploaded
            </div>
            {!isLocked && (
              <button type="button" onClick={deleteSelfie}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition duration-150">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {!loadingState.selfie && !localSelfiePreview && !isSelfieUploaded && (
          <input type="file" accept="image/*" capture="user" onChange={uploadSelfie} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
        )}
      </div>
    );
  }

  // ─── Step 3: Documents ─────────────────────────────────────────────
  function Step3Documents() {
    if (isLocked && docsComplete) {
      return (
        <div className="space-y-3">
          {uploadedDocs.map((d, i) => (
            <div key={i} className="relative w-full h-40 border rounded-lg overflow-hidden bg-gray-150">
              {d.url.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-4">
                  <span className="text-4xl">📄</span>
                  <span className="text-xs text-gray-600 mt-2 font-medium capitalize">{d.kind.replace('_', ' ')}</span>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline mt-1 font-semibold">View PDF</a>
                </div>
              ) : (
                <img src={d.url} alt={d.kind} loading="lazy" className="object-cover w-full h-full" />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-green-600/80 px-3 py-1.5 text-xs text-white capitalize font-medium">
                ✓ {d.kind.replace('_', ' ')} {isApproved ? 'approved' : 'submitted'}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">3</span>
          <h2 className="font-semibold">Upload Documents</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">Upload the documents required for your role. (Max 900KB. Images compressed automatically)</p>
          {user.role === 'landlord' && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">As a landlord, you need to upload <b>2 documents</b>: a <b>utility bill</b> (e.g. electricity, water, or waste bill) and a <b>property ownership document</b> (e.g. deed of assignment, C of O, or rent receipt from the head landlord).</p>}

        {loadingState.doc && (
          <div className="flex items-center justify-center p-6 border rounded-lg bg-gray-50 border-dashed">
            <span className="spinner mr-2" /> <span className="text-sm text-gray-500">{loadingState.doc}</span>
          </div>
        )}

        {!loadingState.doc && localDocPreview && (
          <div className="relative w-full h-40 border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {localDocPreview === 'pdf' ? (
              <span className="text-sm font-semibold text-gray-500">📄 PDF Document</span>
            ) : (
              <img src={localDocPreview} alt="Uploading" loading="lazy" className="object-cover w-full h-full" />
            )}
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white text-xs font-semibold">
              Processing...
            </div>
          </div>
        )}

        {!loadingState.doc && !localDocPreview && (
          <div className="space-y-3">
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
                    <img src={d.url} alt={d.kind} loading="lazy" className="object-cover w-full h-full" />
                  )}
                  {!isLocked && (
                    <div className="absolute top-2 right-2">
                      <button type="button" onClick={() => deleteDoc(d.kind)}
                        className="p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition duration-150">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1.5 text-xs text-white capitalize font-medium">
                    ✓ {d.kind.replace('_', ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loadingState.doc && !localDocPreview && !isLocked && uploadedDocs.length < (user.role === 'landlord' ? 2 : 1) && (
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
    );
  }

  // ─── Step 4: Review & Submit ───────────────────────────────────────
  function Step4Submit() {
    if (isApproved) {
      return (
        <div className="card text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-green-700">Verification Approved</h3>
          <p className="text-sm text-gray-600 mt-1">Your account has been fully verified. You now have access to all features.</p>
        </div>
      );
    }

    if (isSubmitting) {
      return (
        <div className="card text-center py-8">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-brand-700">Under Review</h3>
          <p className="text-sm text-gray-600 mt-1">Your verification has been submitted. An admin will review and approve it within 24 hours.</p>
        </div>
      );
    }

    const allComplete = identityComplete && isSelfieUploaded && docsComplete;
    const missing = [];
    if (!identityComplete) {
      if (user.role === 'landlord') missing.push('Verify your NIN and BVN (Step 1)');
      else missing.push('Verify your NIN (Step 1)');
    }
    if (!isSelfieUploaded) missing.push('Upload your selfie (Step 2)');
    if (!docsComplete) missing.push('Upload your documents (Step 3)');

    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">4</span>
          <h2 className="font-semibold">Review & Submit</h2>
        </div>

        {!allComplete ? (
          <>
            <p className="text-sm text-gray-600 mb-3">Please complete all steps before submitting.</p>
            <ul className="space-y-2">
              {missing.map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-red-600">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {m}
                </li>
              ))}
            </ul>
          </>
        ) : confirming ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800">Please check your documents carefully before submitting.</p>
              <p className="text-sm text-amber-700 mt-1">After submission, your verification data will be locked and you won't be able to make changes. To edit later, you'll need to contact an admin.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleSubmit} disabled={loading.finalize} className="btn-primary flex-1">
                {loading.finalize ? <span className="spinner" /> : 'Yes, submit for review'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {(user.role === 'student' || user.role === 'corper') && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Housing budget (optional)</p>
                <p className="text-xs text-gray-500 mb-3">Set your yearly budget for roommate matching. You can adjust this later.</p>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="label text-xs">Min (₦/yr)</label>
                    <input className="input" type="text" inputMode="numeric" placeholder="e.g. 200,000" value={budgetMin} onChange={(e) => setBudgetMin(formatPriceInput(e.target.value))} /></div>
                  <div><label className="label text-xs">Max (₦/yr)</label>
                    <input className="input" type="text" inputMode="numeric" placeholder="e.g. 500,000" value={budgetMax} onChange={(e) => setBudgetMax(formatPriceInput(e.target.value))} /></div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>NIN verified</span>
              </div>
              {user.role === 'landlord' && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>BVN verified</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-green-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Selfie uploaded</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{uploadedDocs.map(d => d.kind.replace('_', ' ')).join(', ')} uploaded</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Once submitted, an admin will review and approve your verification within 24 hours.</p>
            <button onClick={() => setConfirming(true)} className="btn-primary w-full">
              Submit for review
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Navigation buttons ────────────────────────────────────────────
  function NavButtons() {
    if (isApproved) return null;
    return (
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1 || isSubmitting}
          className="btn-outline"
        >
          ← Back
        </button>
        {step < 4 && (
          <button
            onClick={() => {
              if (step === 1 && !identityComplete) { showToast('Please complete this step first', 'error'); return; }
              if (step === 2 && !isSelfieUploaded) { showToast('Please upload your selfie first', 'error'); return; }
              if (step === 3 && !docsComplete) { showToast('Please upload your documents first', 'error'); return; }
              setStep(s => Math.min(4, s + 1));
            }}
            className="btn-primary"
          >
            Continue →
          </button>
        )}
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <Layout>
      {ConfettiOverlay()}
      {ToastBar()}

      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Verification</h1>
          <VerificationBadge user={user} />
        </div>

        {StepIndicator()}

        {isApproved ? Step4Submit()
         : step === 1 ? Step1Identity()
         : step === 2 ? Step2Selfie()
         : step === 3 ? Step3Documents()
         : Step4Submit()}

        {NavButtons()}

        <div className="card mt-6">
          <h3 className="font-semibold">What happens next</h3>
          <p className="mt-1 text-sm text-gray-600">
            Once you've submitted everything, an admin reviews your documents (usually within 24 h).
            You'll get an email when you're approved. Until then you can browse listings but can't
            book inspections or pay.
          </p>
          {user.role === 'landlord' && (
            <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-600">
              <p className="font-medium text-gray-700">Landlord checklist:</p>
              <ul className="mt-1 list-inside space-y-0.5">
                <li>✓ Verify your <b>NIN</b> (step 1a)</li>
                <li>✓ Verify your <b>BVN</b> (step 1b)</li>
                <li>✓ Upload a <b>selfie</b> (step 2)</li>
                <li>✓ Upload a <b>utility bill</b> (step 3)</li>
                <li>✓ Upload a <b>property ownership document</b> (step 3)</li>
              </ul>
            </div>
          )}
          {(user.role === 'student' || user.role === 'corper') && (
            <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-600">
              <p className="font-medium text-gray-700">{user.role === 'student' ? 'Student' : 'Corper'} checklist:</p>
              <ul className="mt-1 list-inside space-y-0.5">
                <li>✓ Verify your <b>NIN</b> (step 1)</li>
                <li>✓ Upload a <b>selfie</b> (step 2)</li>
                <li>✓ Upload your <b>{user.role === 'student' ? 'school ID' : 'NYSC ID'}</b> (step 3)</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
