import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';
import { compressImage } from '../../../lib/image';

const FIELDS = [
  { id: 'title', label: 'Title', type: 'text' },
  { id: 'area', label: 'Area (publicly visible)', placeholder: 'e.g. Agbowo, Ibadan' },
  { id: 'fullAddress', label: 'Full address (gated)', placeholder: 'e.g. 12 Demo Crescent, Agbowo, Ibadan' },
  { id: 'annualRent', label: 'Annual rent (₦)', type: 'number' },
  { id: 'serviceCharge', label: 'Service charge (₦)', type: 'number' },
  { id: 'cautionFee', label: 'Caution fee (₦)', type: 'number' },
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

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  const removeMediaItem = (indexToRemove) => {
    setMedia((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function uploadMedia(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLoading(true);
    setUploadStatus('Compressing images...');
    try {
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith('image/')) {
            return await compressImage(file, 900);
          }
          return file;
        })
      );
      setUploadStatus('Uploading...');
      const fd = new FormData();
      compressedFiles.forEach((f) => fd.append('files', f));
      const { data } = await api.post('/upload/many', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMedia((m) => [...m, ...data.files]);
    } catch (err) {
      showToast('Media upload failed', 'error');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  }

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const payload = {
        ...form,
        annualRent: Number(form.annualRent),
        serviceCharge: Number(form.serviceCharge || 0),
        cautionFee: Number(form.cautionFee || 0),
        inspectionFee: Number(form.inspectionFee || 3000),
        distanceToAnchorKm: form.distanceToAnchorKm ? Number(form.distanceToAnchorKm) : undefined,
        nearSchools: form.nearSchools ? form.nearSchools.split(',').map((s) => s.trim()) : [],
        servingStates: form.servingStates ? form.servingStates.split(',').map((s) => s.trim()) : [],
        installmentPlan: form.installmentEnabled ? { months: Number(form.installmentMonths) } : undefined,
        media,
      };
      const { data } = await api.post('/properties', payload);
      // Auto-submit for review (need media validated server-side at active/pending_review state)
      try { await api.post(`/properties/${data._id}/publish`); } catch (e) { /* min-media not yet met */ }
      showToast('Listing created successfully!', 'success');
      setTimeout(() => router.push('/dashboard/landlord'), 1500);
    } catch (e) { showToast(e?.response?.data?.error || 'Could not create listing', 'error'); }
    finally { setLoading(false); }
  }

  const imageCount = media.filter((m) => m.type === 'image').length;
  const videoCount = media.filter((m) => m.type === 'video').length;

  return (
    <Layout>
      <h1 className="mb-2 text-2xl font-bold">New listing</h1>
      <p className="mb-6 text-sm text-gray-600">Minimum 8 images and 5 videos to publish. Address stays gated until inspection is paid for.</p>

      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.id} className={f.id === 'title' || f.id === 'fullAddress' || f.id === 'area' ? 'md:col-span-2' : ''}>
            <label className="label">{f.label}</label>
            <input
              className="input"
              type={f.type || 'text'}
              placeholder={f.placeholder || ''}
              defaultValue={f.defaultValue}
              value={form[f.id] ?? ''}
              onChange={(e) => set(f.id, e.target.value)}
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
          <label className="label">Media (images & videos)</label>
          <p className="text-xs text-gray-500 mb-3">Upload property photos and videos. Max size per image: 900KB. Images are automatically compressed.</p>
          
          <input 
            type="file" 
            multiple 
            accept="image/*,video/*" 
            onChange={uploadMedia} 
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-50"
          />

          {uploadStatus && (
            <p className="mt-2 text-xs text-brand-600 font-medium flex items-center gap-1.5">
              <span className="spinner" /> {uploadStatus}
            </p>
          )}

          {media.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {media.map((item, index) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group">
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={item.url} alt="listing thumbnail" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-1 right-1">
                    <button
                      type="button"
                      onClick={() => removeMediaItem(index)}
                      className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition duration-150"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/45 text-[10px] text-white px-1.5 py-0.5 rounded capitalize font-medium">
                    {item.type}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500 font-medium">
            Progress: {imageCount} / 8 images · {videoCount} / 5 videos
            {imageCount >= 8 && videoCount >= 5 ? (
              <span className="text-green-600 font-semibold ml-2">✓ Minimum requirement met</span>
            ) : (
              <span className="text-amber-600 font-semibold ml-2">⚠️ Need at least 8 images and 5 videos to publish</span>
            )}
          </p>
        </div>

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
        <button disabled={loading} className="btn-primary md:col-span-2">{loading ? '…' : 'Save & submit for review'}</button>
      </form>
    </Layout>
  );
}
