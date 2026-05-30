import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import api, { getUser } from '../../../lib/api';
import { compressImage } from '../../../lib/image';
import { compressVideo } from '../../../lib/video';
import { formatPriceInput } from '../../../lib/format';

const FIELDS = [
  { id: 'title', label: 'Title', type: 'text' },
  { id: 'area', label: 'Area (publicly visible)', placeholder: 'e.g. Agbowo, Ibadan' },
  { id: 'fullAddress', label: 'Full address (gated)', placeholder: 'e.g. 12 Demo Crescent, Agbowo, Ibadan' },
  { id: 'annualRent', label: 'Annual rent (₦)', type: 'number' },
  { id: 'inspectionFee', label: 'Inspection fee (₦, ₦2k–₦5k)', type: 'number', defaultValue: 3000 },
  { id: 'distanceToAnchorKm', label: 'Distance to school/PPA (km)', type: 'number' },
];

export default function NewListing() {
  const router = useRouter();
  const [form, setForm] = useState({
    propertyType: 'self-contain', furnishing: 'unfurnished', bedrooms: 1, bathrooms: 1,
    nearSchools: '', servingStates: '', description: '', installmentEnabled: false, installmentMonths: 6,
  });
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [checkingRules, setCheckingRules] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (u?.landlord?.landlordRulesAcceptedAt) setRulesAccepted(true);
    setCheckingRules(false);
  }, []);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  const removeMediaItem = (indexToRemove) => {
    setMedia((prev) => {
      const item = prev[indexToRemove];
      if (item._localUrl) URL.revokeObjectURL(item._localUrl);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const uploadImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    const curImg = media.filter(m => m.type === 'image').length;
    if (curImg + files.length > 4) { showToast('Maximum 4 images allowed', 'error'); return; }
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    if (totalSize > 3 * 1024 * 1024) { showToast('Total image size must be under 3MB', 'error'); return; }

    const batchId = Date.now() + Math.random();
    const localEntries = files.map(f => ({
      type: 'image', url: '',
      _localUrl: URL.createObjectURL(f), _batchId: batchId,
    }));
    setMedia(m => [...m, ...localEntries]);
    setUploadStatus('Compressing images…');
    setLoading(true);
    try {
      const compressed = await Promise.all(files.map(f => compressImage(f, 700)));
      setUploadStatus('Uploading images…');
      const fd = new FormData();
      compressed.forEach(f => fd.append('files', f));
      const { data } = await api.post('/upload/many', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMedia(m => {
        const copy = [...m];
        let si = 0;
        for (let i = 0; i < copy.length && si < data.files.length; i++) {
          if (copy[i]._batchId === batchId) { URL.revokeObjectURL(copy[i]._localUrl); copy[i] = data.files[si]; si++; }
        }
        return copy;
      });
    } catch {
      localEntries.forEach(e => URL.revokeObjectURL(e._localUrl));
      setMedia(m => m.filter(item => item._batchId !== batchId));
      showToast('Image upload failed', 'error');
    } finally { setLoading(false); setUploadStatus(''); }
  };

  const uploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const batchId = Date.now() + Math.random();
    const localEntry = {
      type: 'video', url: '',
      _localUrl: URL.createObjectURL(file), _batchId: batchId,
    };
    setMedia(m => [...m, localEntry]);
    setUploadStatus('Compressing video…');
    setLoading(true);
    try {
      const compressed = await compressVideo(file);
      setUploadStatus('Uploading video…');
      const fd = new FormData();
      fd.append('files', compressed);
      const { data } = await api.post('/upload/many', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMedia(m => {
        const copy = [...m];
        for (let i = 0; i < copy.length; i++) {
          if (copy[i]._batchId === batchId) { URL.revokeObjectURL(copy[i]._localUrl); copy[i] = data.files[0]; break; }
        }
        return copy;
      });
    } catch {
      URL.revokeObjectURL(localEntry._localUrl);
      setMedia(m => m.filter(item => item._batchId !== batchId));
      showToast('Video upload failed', 'error');
    } finally { setLoading(false); setUploadStatus(''); }
  };

  async function submit(e) {
    e.preventDefault();
    if (media.filter(m => m.type === 'image').length < 1) {
      showToast('Upload at least 1 image before submitting', 'error'); return;
    }
    setLoading(true);
    setUploadStatus('Creating listing…');
    try {
      const stripCommas = (v) => Number(String(v).replace(/,/g, ''));
      const payload = {
        ...form,
        annualRent: stripCommas(form.annualRent),
        inspectionFee: stripCommas(form.inspectionFee || 3000),
        distanceToAnchorKm: form.distanceToAnchorKm ? Number(form.distanceToAnchorKm) : undefined,
        nearSchools: form.nearSchools ? form.nearSchools.split(',').map((s) => s.trim()) : [],
        servingStates: form.servingStates ? form.servingStates.split(',').map((s) => s.trim()) : [],
        installmentPlan: form.installmentEnabled ? { months: Number(form.installmentMonths) } : undefined,
        media,
      };
      const { data } = await api.post('/properties', payload);
      setUploadStatus('Submitting for review…');
      await api.post(`/properties/${data._id}/publish`);
      showToast('Listing created successfully!', 'success');
      setTimeout(() => router.push('/dashboard/landlord'), 1500);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Could not create listing';
      showToast(msg, 'error');
      setLoading(false);
      setUploadStatus('');
    }
  }

  const imageCount = media.filter((m) => m.type === 'image').length;
  const videoCount = media.filter((m) => m.type === 'video').length;

  return (
    <Layout>
      <h1 className="mb-2 text-2xl font-bold">New listing</h1>
      <p className="mb-6 text-sm text-gray-600">Address stays gated until inspection is paid for.</p>

      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><fieldset disabled={loading} className="contents">
        {FIELDS.map((f) => (
          <div key={f.id} className={f.id === 'title' || f.id === 'fullAddress' || f.id === 'area' ? 'md:col-span-2' : ''}>
            <label className="label">{f.label}</label>
            <input
              className="input"
              type={['annualRent', 'inspectionFee'].includes(f.id) ? 'text' : (f.type || 'text')}
              placeholder={f.placeholder || ''}
              defaultValue={f.defaultValue}
              value={form[f.id] ?? ''}
              onChange={(e) => {
                const val = ['annualRent', 'inspectionFee'].includes(f.id) ? formatPriceInput(e.target.value) : e.target.value;
                set(f.id, val);
              }}
              required={['title', 'area', 'fullAddress', 'annualRent'].includes(f.id)}
            />
          </div>
        ))}
        <div><label className="label">Type</label>
          <select className="input" value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
            {['self-contain', 'one-bedroom', 'two-bedroom', 'three-bedroom', 'shared-room', 'hostel'].map((x) => <option key={x}>{x}</option>)}
          </select></div>
        <div><label className="label">Furnishing</label>
          <select className="input" value={form.furnishing} onChange={(e) => set('furnishing', e.target.value)}>
            {['unfurnished', 'semi-furnished', 'furnished'].map((x) => <option key={x}>{x}</option>)}
          </select></div>
        <div><label className="label">Bedrooms</label>
          <input type="number" className="input" min={1} value={form.bedrooms} onChange={(e) => set('bedrooms', Number(e.target.value))} /></div>
        <div><label className="label">Bathrooms</label>
          <input type="number" className="input" min={1} value={form.bathrooms} onChange={(e) => set('bathrooms', Number(e.target.value))} /></div>
        <div className="md:col-span-2"><label className="label">Near schools (comma-separated)</label>
          <input className="input" placeholder="University of Ibadan, Polytechnic Ibadan" value={form.nearSchools} onChange={(e) => set('nearSchools', e.target.value)} /></div>
        <div className="md:col-span-2"><label className="label">Serving states for corpers (comma-separated)</label>
          <input className="input" placeholder="Oyo, Osun" value={form.servingStates} onChange={(e) => set('servingStates', e.target.value)} /></div>
        <div className="md:col-span-2"><label className="label">Description</label>
          <textarea className="input" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>

        <div className="md:col-span-2 flex items-center gap-3">
          <input type="checkbox" id="inst" checked={form.installmentEnabled} onChange={(e) => set('installmentEnabled', e.target.checked)} />
          <label htmlFor="inst" className="text-sm">Allow installment payments</label>
          {form.installmentEnabled && (
            <input type="number" min={2} max={12} className="input ml-2 w-20" value={form.installmentMonths} onChange={(e) => set('installmentMonths', e.target.value)} />
          )}
        </div>

        <div className="md:col-span-2 card">
          <label className="label">Images</label>
          <p className="text-xs text-gray-500 mb-3">Upload up to <b>4 images</b> (total max 3MB). Automatically compressed.</p>
          <input
            type="file" multiple accept="image/*"
            onChange={uploadImages} disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-50"
          />
          {media.filter(m => m.type === 'image').length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {media.filter(m => m.type === 'image').map((item, idx) => (
                <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition-shadow duration-200 group">
                  <img src={item._localUrl || item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  <button type="button" onClick={() => removeMediaItem(media.indexOf(item))}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500 font-medium">{imageCount} / 4 images</p>
        </div>

        <div className="md:col-span-2 card">
          <label className="label">Video <span className="text-gray-400 font-normal">(optional)</span></label>
          <p className="text-xs text-gray-500 mb-3">Upload <b>1 video</b> (max 10MB).</p>
          <input
            type="file" accept="video/*"
            onChange={uploadVideo} disabled={loading || videoCount >= 1}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-50"
          />
          {media.filter(m => m.type === 'video').map((item, idx) => (
            <div key={idx} className="mt-3 relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm max-w-md group">
              <video src={item._localUrl || item.url} className="w-full h-full object-cover" muted controls />
              <button type="button" onClick={() => removeMediaItem(media.indexOf(item))}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <p className="mt-1 text-xs text-gray-500 font-medium">{videoCount} / 1 video</p>
        </div>

        {uploadStatus && (
          <div className="md:col-span-2">
            <p className="text-xs text-brand-600 font-medium flex items-center gap-1.5">
              <span className="spinner" /> {uploadStatus}
            </p>
          </div>
        )}

        {toast && (
          <div className="md:col-span-2">
            <div className={`rounded-xl text-white px-5 py-3.5 text-sm font-medium shadow-xl flex items-center gap-2.5 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1">{toast.msg}</span>
            </div>
          </div>
        )}
        <div className="md:col-span-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <input type="checkbox" id="acceptRules" checked={rulesAccepted} disabled={checkingRules} onChange={(e) => {
            if (e.target.checked) {
              api.post('/verify/landlord-rules', { accept: true }).then(() => setRulesAccepted(true)).catch(() => setRulesAccepted(false));
            }
          }} className="mt-0.5" />
          <label htmlFor="acceptRules" className={`text-sm ${rulesAccepted ? 'text-amber-700' : 'text-amber-900'}`}>
            I have read and accept the <Link href="/legal/landlord-rules" target="_blank" className="text-brand-700 underline font-medium">Landlord Platform Rules & Regulations</Link> before listing my property.
            {rulesAccepted && <span className="block text-xs text-green-700 font-medium mt-1">✓ Accepted</span>}
          </label>
        </div>
        <button disabled={loading || !rulesAccepted || checkingRules} className="btn-primary md:col-span-2 inline-flex items-center justify-center gap-2">
          {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
          {loading ? 'Processing…' : 'Save & submit for review'}
        </button>
        </fieldset>
      </form>
    </Layout>
  );
}
