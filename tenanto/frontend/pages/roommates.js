import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api, { getUser } from '../lib/api';
import { naira } from '../lib/format';

export default function Roommates() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);

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
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.budgetMin = Number(data.budgetMin);
    data.budgetMax = Number(data.budgetMax);
    data.smoker = data.smoker === 'on';
    data.lookingFor = Number(data.lookingFor || 1);
    try {
      const { data: r } = await api.post('/roommates/profile', data);
      setProfile(r.profile); setEditing(false); load();
    } catch (e) { setMsg(e?.response?.data?.error || 'Failed'); }
  }

  async function invite(targetUserId) {
    const message = prompt('Send a message to introduce yourself (optional):');
    try {
      await api.post('/roommates/invite', { userId: targetUserId, message });
      setMsg('Invite sent ✓');
    } catch (e) { setMsg(e?.response?.data?.error || 'Failed'); }
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
          <p className="text-sm text-gray-600">Match by school, budget, lifestyle. Invite via in-app chat (no contact info shared).</p>
        </div>
        {profile && !editing && <button onClick={() => setEditing(true)} className="btn-outline">Edit profile</button>}
      </div>

      {msg && <div className="card mb-4 border-brand-200 bg-brand-50 text-sm text-brand-800">{msg}</div>}

      {(!profile || editing) ? (
        <form onSubmit={save} className="card grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold">Your roommate profile</h2>
          <div><label className="label">Department</label>
            <input name="department" className="input" defaultValue={profile?.department || user.student?.department || ''} /></div>
          <div><label className="label">Year of study</label>
            <input name="yearOfStudy" type="number" min="1" max="6" className="input" defaultValue={profile?.yearOfStudy || ''} /></div>
          <div><label className="label">Budget min (₦/yr)</label>
            <input name="budgetMin" type="number" required className="input" defaultValue={profile?.budgetMin || 200000} /></div>
          <div><label className="label">Budget max (₦/yr)</label>
            <input name="budgetMax" type="number" required className="input" defaultValue={profile?.budgetMax || 500000} /></div>
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
          <div className="md:col-span-2"><label className="label">Bio</label>
            <textarea name="bio" rows={3} className="input" defaultValue={profile?.bio || ''} /></div>
          <button className="btn-primary md:col-span-2">{profile ? 'Save changes' : 'Create profile'}</button>
        </form>
      ) : (
        <>
          <div className="card mb-6">
            <h2 className="font-semibold">Your profile</h2>
            <p className="mt-1 text-sm text-gray-600">
              {profile.school || profile.state} · {profile.department || '—'} · budget {naira(profile.budgetMin)}–{naira(profile.budgetMax)} ·{' '}
              {profile.cleanliness} / {profile.socialLevel} / {profile.sleepSchedule}
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
                  <p className="mt-1 text-xs text-gray-500">Budget {naira(p.budgetMin)}–{naira(p.budgetMax)}</p>
                  {p.bio && <p className="mt-2 text-sm italic text-gray-600">"{p.bio.slice(0, 120)}"</p>}
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
