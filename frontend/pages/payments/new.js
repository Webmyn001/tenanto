import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { naira, formatPriceInput } from '../../lib/format';

export default function NewPayment() {
  const router = useRouter();
  const { propertyId } = router.query;
  const [property, setProperty] = useState(null);
  const [mode, setMode] = useState('full');
  const [months, setMonths] = useState(6);
  const [contributors, setContributors] = useState([]); // [{ user, email, amount }]
  const [contribEmail, setContribEmail] = useState('');
  const [contribAmount, setContribAmount] = useState('');
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const [busy, setBusy] = useState(false);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (!propertyId) return;
    api.get(`/properties/${propertyId}`).then(({ data }) => setProperty(data.property));
  }, [propertyId]);

  if (!property) return <Layout><div className="card animate-pulse h-40" /></Layout>;

  const platformFeeTenant = Math.round(property.annualRent * 0.05);
  const totalDue = property.annualRent + (property.serviceCharge || 0) + (property.cautionFee || 0) + platformFeeTenant - (property.inspectionFee || 0);
  const contribSum = contributors.reduce((s, c) => s + Number(c.amount || 0), 0);

  async function addContributor() {
    if (!contribEmail || !contribAmount) return showToast('Email and amount required', 'error');
    try {
      const { data } = await api.get(`/lookup/email?email=${encodeURIComponent(contribEmail)}`);
      if (contributors.find((c) => c.user === data.user._id)) return showToast('Already added', 'error');
      setContributors([...contributors, { user: data.user._id, email: data.user.email, name: data.user.fullName, amount: Number(contribAmount.replace(/,/g, '')) }]);
      setContribEmail(''); setContribAmount('');
    } catch (e) { showToast(e?.response?.data?.error || 'No user with that email — they need to sign up first', 'error'); }
  }

  function removeContributor(userId) {
    setContributors(contributors.filter((c) => c.user !== userId));
  }

  async function initiate() {
    setBusy(true);
    try {
      const payload = { propertyId, paymentMode: mode };
      if (mode === 'installment') payload.installmentMonths = Number(months);
      if (mode === 'group') {
        if (contribSum !== totalDue) return showToast(`Contributor amounts sum to ${naira(contribSum)}, must equal ${naira(totalDue)}`, 'error');
        payload.contributors = contributors.map((c) => ({ user: c.user, amount: c.amount }));
      }
      const { data } = await api.post('/payments/initiate', payload);
      if (data.init?.authorizationUrl) {
        window.location.href = data.init.authorizationUrl + (data.init.authorizationUrl.includes('?') ? '&' : '?') + `paymentId=${data.payment._id}`;
      } else {
        showToast('Payment initiated successfully', 'success');
        router.push('/dashboard/tenant');
      }
    } catch (e) { showToast(e?.response?.data?.error || 'Payment initiation failed', 'error'); }
    finally { setBusy(false); }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <div className="card">
          <h1 className="text-2xl font-bold">Pay rent</h1>
          <p className="mt-1 text-sm text-gray-600">{property.title} · {property.area}</p>

          <ul className="mt-5 divide-y text-sm">
            <li className="flex justify-between py-2"><span>Annual rent</span><b>{naira(property.annualRent)}</b></li>
            <li className="flex justify-between py-2"><span>Service charge</span><b>{naira(property.serviceCharge)}</b></li>
            <li className="flex justify-between py-2"><span>Caution fee</span><b>{naira(property.cautionFee)}</b></li>
            <li className="flex justify-between py-2"><span>Platform fee (5%)</span><b>{naira(platformFeeTenant)}</b></li>
            <li className="flex justify-between py-2 text-brand-700"><span>Inspection credit</span><b>− {naira(property.inspectionFee)}</b></li>
            <li className="flex justify-between py-3 text-lg"><span>Total due</span><b>{naira(totalDue)}</b></li>
          </ul>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { id: 'full', label: 'Pay in full' },
              { id: 'installment', label: 'Installments', disabled: !property.installmentEnabled },
              { id: 'group', label: 'Group / split' },
            ].map((m) => (
              <button key={m.id} disabled={m.disabled} onClick={() => setMode(m.id)}
                className={`rounded-lg border px-3 py-2 text-sm ${mode === m.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200'} ${m.disabled ? 'opacity-50' : ''}`}>
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'installment' && (
            <div className="mt-3">
              <label className="label">Months</label>
              <input type="number" min={2} max={12} className="input w-32" value={months} onChange={(e) => setMonths(e.target.value)} />
              <p className="mt-1 text-xs text-gray-500">Approx {naira(Math.ceil(totalDue / Number(months)))} / month</p>
            </div>
          )}

          {mode === 'group' && (
            <div className="card mt-4 bg-gray-50">
              <h3 className="font-semibold">Roommates &amp; their shares</h3>
              <p className="text-xs text-gray-500">Each roommate must already have a verified account. Total must equal {naira(totalDue)}.</p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center justify-between rounded-lg border bg-white p-2 text-sm">
                  <span><b>You</b> · auto-included as lead tenant</span>
                </li>
                {contributors.map((c) => (
                  <li key={c.user} className="flex items-center justify-between rounded-lg border bg-white p-2 text-sm">
                    <span>{c.name} ({c.email}) — <b>{naira(c.amount)}</b></span>
                    <button onClick={() => removeContributor(c.user)} className="text-xs text-red-600 hover:underline">remove</button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input type="email" className="input flex-1" placeholder="roommate@example.com"
                  value={contribEmail} onChange={(e) => setContribEmail(e.target.value)} />
                <input type="text" inputMode="numeric" className="input w-32" placeholder="₦ share"
                  value={contribAmount} onChange={(e) => setContribAmount(formatPriceInput(e.target.value))} />
                <button type="button" onClick={addContributor} className="btn-outline">Add</button>
              </div>
              <p className="mt-2 text-xs">Sum: <b>{naira(contribSum)}</b> / {naira(totalDue)} {contribSum === totalDue && contributors.length > 0 && <span className="text-brand-700">✓ matches</span>}</p>
            </div>
          )}

          {toast && (
            <div className="mt-3">
              <div className={`rounded-xl text-white px-5 py-3.5 text-sm font-medium shadow-xl flex items-center gap-2.5 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="flex-1">{toast.msg}</span>
              </div>
            </div>
          )}
          <button onClick={initiate} disabled={busy} className="btn-primary mt-5 w-full">
            {busy ? '…' : `Continue to Paystack (${naira(totalDue)})`}
          </button>

          <div className="card mt-4 border-amber-200 bg-amber-50 text-xs text-amber-800">
            🔒 Funds go to escrow — released to landlord only after you confirm move-in.
          </div>
        </div>
      </div>
    </Layout>
  );
}
