import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import api, { getUser } from '../lib/api';

export default function Roommates() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  function showToast(msg, type) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type: type || 'error' });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => { setUser(getUser()); load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/roommates/profile');
      setProfile(data.profile);
      if (data.profile) {
        const m = await api.get('/roommates/matches');
        setMatches(m.data.matches);
      }
    } catch {} finally { setLoading(false); }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    if (!data.yearOfStudy) { showToast('Year of study is required', 'error'); setSaving(false); return; }
    if (!data.department) { showToast('Department is required', 'error'); setSaving(false); return; }
    data.smoker = data.smoker === 'on';
    data.lookingFor = Number(data.lookingFor || 1);
    if (data.yearOfStudy) data.yearOfStudy = Number(data.yearOfStudy);
    try {
      const { data: r } = await api.post('/roommates/profile', data);
      setProfile(r.profile); setEditing(false);
      showToast('Roommate profile saved ✓', 'success');
      load();
    } catch (e) { showToast(e?.response?.data?.error || 'Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function invite(targetUserId) {
    const message = prompt('Send a message to introduce yourself (optional):');
    try {
      await api.post('/roommates/invite', { userId: targetUserId, message });
      showToast('Invite sent ✓', 'success');
    } catch (e) { showToast(e?.response?.data?.error || 'Failed to send invite', 'error'); }
  }

  if (!user) return <Layout><div className="card">Sign in to use roommate matching.</div></Layout>;
  if (!['student', 'corper'].includes(user.role)) {
    return <Layout><div className="card">Roommate matching is for students and corpers.</div></Layout>;
  }

  return (
    <Layout wide>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Find roommates</h1>
          <p className="text-sm text-gray-600">Fill in your preferences to find compatible roommates. Invite via in-app chat (no contact info shared).</p>
        </div>
        {profile && !editing && <button onClick={() => setEditing(true)} className="btn-outline">Edit profile</button>}
      </div>

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

      {(!profile || editing) ? (
        <form onSubmit={save} className="card grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold">Your preferences</h2>
          <div><label className="label">Department</label>
            <input name="department" className="input" defaultValue={profile?.department || user.student?.department || ''} required /></div>
          <div><label className="label">Year of study</label>
            <input name="yearOfStudy" type="number" min="1" max="6" className="input" defaultValue={profile?.yearOfStudy || ''} required /></div>

          <div><label className="label">Sleep schedule</label>
            <select name="sleepSchedule" className="input" defaultValue={profile?.sleepSchedule || 'flexible'}>
              <option value="early_bird">Early bird</option>
              <option value="night_owl">Night owl</option>
              <option value="flexible">Flexible</option>
            </select></div>
          <div><label className="label">Cleanliness</label>
            <select name="cleanliness" className="input" defaultValue={profile?.cleanliness || 'tidy'}>
              <option value="relaxed">Relaxed</option>
              <option value="tidy">Tidy</option>
              <option value="spotless">Spotless</option>
            </select></div>
          <div><label className="label">Social level</label>
            <select name="socialLevel" className="input" defaultValue={profile?.socialLevel || 'balanced'}>
              <option value="quiet">Quiet</option>
              <option value="balanced">Balanced</option>
              <option value="social">Social</option>
            </select></div>
          <div><label className="label">Gender preference</label>
            <select name="gender" className="input" defaultValue={profile?.gender || 'any'}>
              <option value="any">Any</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </select></div>
          <div><label className="label">Roommates wanted</label>
            <input name="lookingFor" type="number" min="1" max="4" className="input" defaultValue={profile?.lookingFor || 1} /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="smoker" name="smoker" defaultChecked={profile?.smoker} />
            <label htmlFor="smoker">I smoke</label></div>

          <button disabled={saving} className="btn-primary md:col-span-2">
            {saving ? <span className="spinner mr-2" /> : (profile ? 'Update & search' : 'Search for roommates')}
          </button>
        </form>
      ) : (
        <>
          <div className="card mb-6">
            <h2 className="font-semibold">Your profile</h2>
            <p className="mt-1 text-sm text-gray-600">
              {profile.school || profile.state} · {profile.department || '—'} · {profile.cleanliness} / {profile.socialLevel} / {profile.sleepSchedule}
            </p>
          </div>

          <h2 className="mb-3 font-semibold">Top matches</h2>
          {loading ? <div className="card h-40 animate-pulse" /> : matches.length === 0 ? (
            <div className="card text-center text-sm text-gray-500">No matches yet — tell more people about Tenanto!</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matches.map(({ profile: p, score, reasons }) => (
                <div key={p._id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{p.user.fullName}</p>
                      <p className="text-xs text-gray-500 capitalize">{p.user.role}</p>
                    </div>
                    <span className={`badge ${score >= 70 ? '' : 'badge-warn'}`}>{score}% match</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{p.school || p.state} · {p.department || '—'}</p>
                  <ul className="mt-3 space-y-0.5 text-xs text-gray-500">
                    {reasons.slice(0, 4).map((r, i) => <li key={i}>· {r}</li>)}
                  </ul>
                  <button onClick={() => invite(p.user._id)} className="btn-primary mt-3 w-full">Send invite</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
