import { useEffect, useState } from 'react';
import api, { getToken } from '../lib/api';
import { naira, shortDate } from '../lib/format';

const STATUS_LABELS = {
  awaiting_funding: { label: 'Awaiting funding', cls: 'badge-gray' },
  partially_funded: { label: 'Partially funded', cls: 'badge-warn' },
  fully_funded: { label: 'In escrow', cls: 'badge' },
  released: { label: 'Released to landlord', cls: 'badge' },
  refunded: { label: 'Refunded to tenant', cls: 'badge-warn' },
  disputed: { label: 'Disputed', cls: 'badge-warn' },
};

export default function PaymentsPanel({ role }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    try { const { data } = await api.get('/payments/mine'); setItems(data.items); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function confirmMoveIn(id) {
    if (!confirm('Confirm you have moved in? This releases the escrow funds to the landlord.')) return;
    setBusy(id); setErr('');
    try { await api.post(`/payments/${id}/move-in`); await load(); }
    catch (e) { setErr(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(''); }
  }

  async function dispute(id) {
    const reason = prompt('Briefly describe the issue (this opens a dispute and freezes the escrow):');
    if (!reason) return;
    setBusy(id); setErr('');
    try { await api.post(`/payments/${id}/dispute`, { reason }); await load(); }
    catch (e) { setErr(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(''); }
  }

  async function rateTenant(paymentId) {
    const ratingStr = prompt('Rate this tenant 1–5:');
    const rating = Number(ratingStr);
    if (!rating || rating < 1 || rating > 5) return;
    const body = prompt('Optional comments:') || '';
    setBusy(paymentId); setErr('');
    try { await api.post('/reviews/tenancy', { paymentId, rating, body }); await load(); setErr(''); }
    catch (e) { setErr(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(''); }
  }

  async function signAgreement(agreementId) {
    setBusy(agreementId); setErr('');
    try { await api.post(`/agreements/${agreementId}/sign`); await load(); }
    catch (e) { setErr(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(''); }
  }

  function downloadPdf(agreementId) {
    // Fetch with auth header → blob → save
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/agreements/${agreementId}/pdf`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => { if (!r.ok) throw new Error('Download failed'); return r.blob(); })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `agreement-${agreementId}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      })
      .catch((e) => setErr(e.message));
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No payments yet.</p>;
  }

  return (
    <>
      {err && <div className="card mb-3 border-red-200 bg-red-50 text-sm text-red-700">{err}</div>}
      <ul className="divide-y">
        {items.map((p) => {
          const st = STATUS_LABELS[p.escrowStatus] || { label: p.escrowStatus, cls: 'badge-gray' };
          const mySignField = role === 'landlord' ? 'landlordSigned' : 'tenantSigned';
          const otherSignField = role === 'landlord' ? 'tenantSigned' : 'landlordSigned';
          const myFlag = p.agreement?.[mySignField];
          const otherFlag = p.agreement?.[otherSignField];

          return (
            <li key={p._id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{p.property?.title}</p>
                  <p className="text-xs text-gray-500">
                    {naira(p.totalDue)} · {p.paymentMode} · started {shortDate(p.createdAt)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={st.cls}>{st.label}</span>
                    {p.agreement && (
                      <>
                        <span className={myFlag ? 'badge' : 'badge-gray'}>
                          {myFlag ? '✓ You signed' : 'You haven\'t signed'}
                        </span>
                        <span className={otherFlag ? 'badge' : 'badge-gray'}>
                          {otherFlag ? `✓ ${role === 'landlord' ? 'Tenant' : 'Landlord'} signed` : `${role === 'landlord' ? 'Tenant' : 'Landlord'} hasn't signed`}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {role === 'tenant' && p.escrowStatus === 'fully_funded' && (
                    <button onClick={() => confirmMoveIn(p._id)} disabled={busy === p._id} className="btn-primary">
                      {busy === p._id ? '…' : 'Confirm move-in'}
                    </button>
                  )}
                  {role === 'tenant' && ['fully_funded', 'partially_funded'].includes(p.escrowStatus) && (
                    <button onClick={() => dispute(p._id)} disabled={busy === p._id} className="btn-outline">
                      Open dispute
                    </button>
                  )}
                  {role === 'landlord' && p.escrowStatus === 'released' && (
                    <button onClick={() => rateTenant(p._id)} disabled={busy === p._id} className="btn-outline">
                      Rate tenant
                    </button>
                  )}
                  {p.agreement && !myFlag && (
                    <button onClick={() => signAgreement(p.agreement._id)} disabled={busy === p.agreement._id} className="btn-primary">
                      {busy === p.agreement._id ? '…' : 'Sign agreement'}
                    </button>
                  )}
                  {p.agreement && (
                    <button onClick={() => downloadPdf(p.agreement._id)} className="btn-outline">
                      Download PDF
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
