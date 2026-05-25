import { useState, useEffect } from 'react';
import api, { saveAuth, clearAuth, getUser, getToken } from '../lib/api';
import { naira, shortDate } from '../lib/format';

/* ─── SVG Icons ─────────────────────────────────────────────────── */
const Icon = ({ name, className = 'h-5 w-5' }) => {
  const icons = {
    dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>,
    users: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>,
    properties: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>,
    verifications: <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>,
    disputes: <path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19.09H5V4.91h14v14.18zM7 15h10v2H7zm0-4h10v2H7zm0-4h7v2H7z"/>,
    fraud: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>,
    audit: <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>,
    close: <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>,
    menu: <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>,
    search: <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>,
    logout: <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>,
    arrowUp: <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>,
    arrowDown: <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>,
    external: <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>,
    warning: <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {icons[name] || <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>}
    </svg>
  );
};

/* ─── Layout Components ─────────────────────────────────────────── */

function StatCard({ label, value, icon, color = 'brand' }) {
  const colorMap = {
    brand: 'from-brand-500 to-brand-600',
    accent: 'from-accent-500 to-accent-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    violet: 'from-violet-500 to-violet-600',
    red: 'from-red-500 to-red-600',
  };
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-gradient-to-br ${colorMap[color] || colorMap.brand} opacity-10`} />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-ink-900">{value ?? <span className="skeleton inline-block h-7 w-20 rounded" />}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState({ message, icon = 'dashboard' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon name={icon} className="mb-3 h-12 w-12 text-ink-300" />
      <p className="text-sm text-ink-500">{message}</p>
    </div>
  );
}

function paginate(page, pages) {
  if (pages <= 1) return [];
  const delta = 2;
  const range = [];
  for (let i = Math.max(2, page - delta); i <= Math.min(pages - 1, page + delta); i++) range.push(i);
  if (range[0] > 2) range.unshift('...');
  if (range[range.length - 1] < pages - 1) range.push('...');
  range.unshift(1);
  if (pages > 1) range.push(pages);
  return range;
}

/* ─── Main Component ───────────────────────────────────────────── */

export default function SecureAdmin() {
  const [email, setEmail] = useState('admin@tenanto.test');
  const [password, setPassword] = useState('Admin#1234');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [analytics, setAnalytics] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [usersData, setUsersData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [propsData, setPropsData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [verifications, setVerifications] = useState({ items: [] });
  const [disputes, setDisputes] = useState({ items: [] });
  const [fraud, setFraud] = useState({ items: [] });
  const [audit, setAudit] = useState({ items: [] });

  const [sectionLoading, setSectionLoading] = useState(false);
  const [globalMsg, setGlobalMsg] = useState(null);

  const [detailUser, setDetailUser] = useState(null);
  const [detailUserPayments, setDetailUserPayments] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserData, setEditUserData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const [searchUser, setSearchUser] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userPage, setUserPage] = useState(1);

  const [propStatus, setPropStatus] = useState('');
  const [propSearch, setPropSearch] = useState('');
  const [propPage, setPropPage] = useState(1);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user?.role === 'admin') {
      setAuthenticated(true);
      setAdminUser(user);
    }
  }, []);

  useEffect(() => {
    if (authenticated) fetchSection(activeSection);
  }, [authenticated, activeSection, searchUser, userRole, userPage, propSearch, propStatus, propPage]);

  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const resp = await api.post('/auth/admin-login', { email, password });
      saveAuth(resp.data.token, resp.data.user);
      setAuthenticated(true);
      setAdminUser(resp.data.user);
    } catch (err) {
      setAuthError(err?.response?.data?.error || 'Invalid credentials');
    } finally { setAuthLoading(false); }
  }

  function handleLogout() {
    clearAuth();
    setAuthenticated(false);
    setAdminUser(null);
    setAnalytics(null);
  }

  async function fetchSection(section) {
    setSectionLoading(true);
    setGlobalMsg(null);
    try {
      switch (section) {
        case 'overview':
          {
            const [analyticsResp, breakdownResp] = await Promise.all([
              api.get('/admin/analytics'),
              api.get('/admin/analytics/breakdown'),
            ]);
            setAnalytics(analyticsResp.data);
            setBreakdown(breakdownResp.data);
          }
          break;
        case 'users':
          {
            const params = new URLSearchParams({ page: userPage });
            if (searchUser) params.set('search', searchUser);
            if (userRole) params.set('role', userRole);
            const { data } = await api.get(`/admin/users?${params}`);
            setUsersData(data);
          }
          break;
        case 'properties':
          {
            const params = new URLSearchParams({ page: propPage });
            if (propSearch) params.set('search', propSearch);
            if (propStatus) params.set('status', propStatus);
            const { data } = await api.get(`/admin/properties?${params}`);
            setPropsData(data);
          }
          break;
        case 'verifications':
          {
            const { data } = await api.get('/admin/verifications');
            setVerifications(data);
          }
          break;
        case 'disputes':
          {
            const { data } = await api.get('/admin/disputes');
            setDisputes(data);
          }
          break;
        case 'fraud':
          {
            const { data } = await api.get('/admin/fraud');
            setFraud(data);
          }
          break;
        case 'audit':
          {
            const { data } = await api.get('/admin/audit');
            setAudit(data);
          }
          break;
      }
    } catch { setGlobalMsg('Failed to load data'); }
    setSectionLoading(false);
  }

  async function doAction(url, successMsg, reload = true, body) {
    try {
      await api.post(url, body || {});
      if (reload) fetchSection(activeSection);
      setGlobalMsg({ type: 'success', text: successMsg });
      setTimeout(() => setGlobalMsg(null), 3000);
    } catch (err) {
      setGlobalMsg({ type: 'error', text: err?.response?.data?.error || 'Action failed' });
    }
  }

  async function openDetail(userId) {
    setDetailLoading(true);
    setShowDetailModal(true);
    setDetailUser(null);
    setDetailUserPayments([]);
    try {
      const [userResp, payResp] = await Promise.all([
        api.get(`/admin/users/${userId}`),
        api.get(`/admin/users/${userId}/payments`),
      ]);
      setDetailUser(userResp.data.user);
      setDetailUserPayments(payResp.data.items || []);
    } catch {
      setGlobalMsg({ type: 'error', text: 'Failed to load user details' });
      setTimeout(() => setGlobalMsg(null), 3000);
    }
    setDetailLoading(false);
  }

  function closeDetail() {
    setShowDetailModal(false);
    setDetailUser(null);
    setDetailUserPayments([]);
  }

  function openEdit(user) {
    setEditUserData(JSON.parse(JSON.stringify(user)));
    setShowEditModal(true);
  }

  function closeEdit() {
    setShowEditModal(false);
    setEditUserData(null);
  }

  async function handleUpdateUser() {
    if (!editUserData) return;
    try {
      const payload = {
        fullName: editUserData.fullName,
        email: editUserData.email,
        phone: editUserData.phone,
        role: editUserData.role,
        verificationStatus: editUserData.verificationStatus,
        verificationNotes: editUserData.verificationNotes,
        suspended: editUserData.suspended,
        suspensionReason: editUserData.suspensionReason,
        trustScore: editUserData.trustScore,
        badges: editUserData.badges,
      };
      if (editUserData.student) payload.student = editUserData.student;
      if (editUserData.corper) payload.corper = editUserData.corper;
      if (editUserData.landlord) payload.landlord = editUserData.landlord;
      await api.put(`/admin/users/${editUserData._id}`, payload);
      setGlobalMsg({ type: 'success', text: 'User updated' });
      setTimeout(() => setGlobalMsg(null), 3000);
      closeEdit();
      openDetail(editUserData._id);
      fetchSection('users');
    } catch (err) {
      setGlobalMsg({ type: 'error', text: err?.response?.data?.error || 'Update failed' });
      setTimeout(() => setGlobalMsg(null), 3000);
    }
  }

  function requestConfirm({ title, message, word, onConfirm }) {
    setConfirmAction({ title, message, word, onConfirm, step: 1, input: '' });
  }

  function requestDelete(userId, userName) {
    requestConfirm({
      title: 'Delete user',
      message: `Are you sure you want to permanently delete ${userName}? This action cannot be undone. All data associated with this account will be lost.`,
      word: 'DELETE',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${userId}`);
          setGlobalMsg({ type: 'success', text: 'User deleted' });
          setTimeout(() => setGlobalMsg(null), 3000);
          closeDetail();
          fetchSection('users');
        } catch (err) {
          setGlobalMsg({ type: 'error', text: err?.response?.data?.error || 'Delete failed' });
          setTimeout(() => setGlobalMsg(null), 3000);
        }
      },
    });
  }

  function requestSuspend(userId, userName) {
    requestConfirm({
      title: 'Suspend user',
      message: `Are you sure you want to suspend ${userName}? They will lose access to their account and won't be able to log in.`,
      word: 'SUSPEND',
      onConfirm: async () => {
        try {
          await api.post(`/admin/users/${userId}/suspend`);
          setGlobalMsg({ type: 'success', text: `${userName.split(' ')[0]} suspended` });
          setTimeout(() => setGlobalMsg(null), 3000);
          fetchSection(activeSection);
        } catch (err) {
          setGlobalMsg({ type: 'error', text: err?.response?.data?.error || 'Suspend failed' });
          setTimeout(() => setGlobalMsg(null), 3000);
        }
      },
    });
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'properties', label: 'Properties', icon: 'properties' },
    { id: 'verifications', label: 'Verifications', icon: 'verifications' },
    { id: 'disputes', label: 'Disputes', icon: 'disputes' },
    { id: 'fraud', label: 'Fraud', icon: 'fraud' },
    { id: 'audit', label: 'Audit Log', icon: 'audit' },
  ];

  /* ─── Render: Login ─────────────────────────────────────────── */
  if (!authenticated) {
    return (
      <div className="gradient-warm flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-lift">
                <span className="text-xl font-extrabold font-display">T</span>
              </div>
              <h1 className="text-xl font-bold font-display text-ink-900">Admin Portal</h1>
              <p className="mt-1 text-xs text-ink-500">Restricted access</p>
            </div>

            {authError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <Icon name="warning" className="h-4 w-4 shrink-0" />
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@tenanto.test" required />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={authLoading} className="btn-primary w-full">
                {authLoading ? <span className="spinner" /> : 'Sign in'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-ink-400">
              Sample: <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-ink-600">admin@tenanto.test</code> / <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-ink-600">Admin#1234</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Render: Dashboard ─────────────────────────────────────── */
  return (
    <div className="flex min-h-screen bg-cream-50">
      {globalMsg && (
        <div className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium shadow-lift ${globalMsg.type === 'error' ? 'bg-red-600 text-white' : 'bg-brand-600 text-white'}`}>
          {globalMsg.text}
        </div>
      )}

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-ink-200 bg-white transition-transform duration-200 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-ink-200 px-5">
          <div className="flex items-center gap-2 font-display font-extrabold text-brand-800">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white text-sm">T</span>
            <span>Tenanto</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-ink-100 md:hidden">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-ink-700 hover:bg-ink-100'
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-ink-100 md:hidden">
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold font-display text-ink-900 capitalize">
              {navItems.find(n => n.id === activeSection)?.label || activeSection}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-500 sm:inline">
              {adminUser?.fullName}
            </span>
            <span className="role-admin text-xs">{adminUser?.role}</span>
            <button onClick={handleLogout} className="btn-ghost p-2" title="Sign out">
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {sectionLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <>
              {activeSection === 'overview' && <OverviewSection analytics={analytics} breakdown={breakdown} />}
              {activeSection === 'users' && (
                <UsersSection
                  data={usersData}
                  search={searchUser}
                  onSearch={setSearchUser}
                  role={userRole}
                  onRole={setUserRole}
                  page={userPage}
                  onPage={setUserPage}
                  onView={openDetail}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                  onSuspend={requestSuspend}
                />
              )}
              {activeSection === 'properties' && (
                <PropertiesSection
                  data={propsData}
                  search={propSearch}
                  onSearch={setPropSearch}
                  status={propStatus}
                  onStatus={setPropStatus}
                  page={propPage}
                  onPage={setPropPage}
                  doAction={doAction}
                />
              )}
              {activeSection === 'verifications' && (
                <VerificationsSection data={verifications} doAction={doAction} />
              )}
              {activeSection === 'disputes' && (
                <DisputesSection data={disputes} doAction={doAction} />
              )}
              {activeSection === 'fraud' && (
                <FraudSection data={fraud} onSuspend={requestSuspend} />
              )}
              {activeSection === 'audit' && <AuditSection data={audit} />}
            </>
          )}
        </main>
      </div>

      {/* User Detail Modal */}
      {showDetailModal && (
        <UserDetailModal
          user={detailUser}
          payments={detailUserPayments}
          loading={detailLoading}
          onClose={closeDetail}
          onEdit={() => { if (detailUser) openEdit(detailUser); }}
          onDelete={requestDelete}
        />
      )}

      {/* User Edit Modal */}
      {showEditModal && editUserData && (
        <UserEditModal
          data={editUserData}
          onChange={setEditUserData}
          onSave={handleUpdateUser}
          onClose={closeEdit}
        />
      )}

      {/* Confirmation Dialog (delete / suspend) */}
      {confirmAction && (
        <ConfirmActionDialog
          action={confirmAction}
          onChange={setConfirmAction}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

/* ─── Section: Overview ─────────────────────────────────────────── */
function OverviewSection({ analytics, breakdown }) {
  const cards = [
    { label: 'Total Users', value: analytics?.users, icon: 'users', color: 'brand' },
    { label: 'Total Properties', value: analytics?.listings, icon: 'properties', color: 'blue' },
    { label: 'Active Listings', value: analytics?.activeListings, icon: 'properties', color: 'green' },
    { label: 'Payments', value: analytics?.payments, icon: 'dashboard', color: 'violet' },
    { label: 'In Escrow', value: analytics ? naira(analytics.escrowedNaira) : null, icon: 'dashboard', color: 'accent' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {breakdown && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <BarChart
            title="Users by Verification Status"
            data={breakdown.verificationCounts}
            bars={[
              { key: 'pending', label: 'Pending', color: 'bg-ink-300' },
              { key: 'submitted', label: 'Submitted', color: 'bg-accent-400' },
              { key: 'approved', label: 'Approved', color: 'bg-brand-500' },
              { key: 'rejected', label: 'Rejected', color: 'bg-red-400' },
            ]}
          />
          <BarChart
            title="Users by Role"
            data={breakdown.roleCounts}
            bars={[
              { key: 'student', label: 'Student', color: 'bg-blue-500' },
              { key: 'corper', label: 'Corper', color: 'bg-green-500' },
              { key: 'landlord', label: 'Landlord', color: 'bg-violet-500' },
              { key: 'admin', label: 'Admin', color: 'bg-red-500' },
            ]}
          />
          {breakdown.registrationTrend?.length > 0 && (
            <div className="lg:col-span-2">
              <TrendChart data={breakdown.registrationTrend} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarChart({ title, data, bars }) {
  const maxVal = Math.max(...bars.map(b => data[b.key] ?? 0), 1);
  const total = bars.reduce((s, b) => s + (data[b.key] ?? 0), 0);

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-bold font-display text-ink-900">{title}</h3>
      <div className="space-y-3">
        {bars.map(b => {
          const val = data[b.key] ?? 0;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={b.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-ink-700">{b.label}</span>
                <span className="font-semibold text-ink-900">{val} <span className="text-xs font-normal text-ink-400">({total > 0 ? Math.round((val / total) * 100) : 0}%)</span></span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div className={`h-full rounded-full transition-all duration-500 ${b.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendChart({ data }) {
  if (!data || data.length === 0) return null;
  const vals = data.map(d => d.count);
  const maxVal = Math.max(...vals, 1);
  const total = vals.reduce((s, v) => s + v, 0);

  return (
    <div className="card">
      <h3 className="mb-1 text-sm font-bold font-display text-ink-900">Registrations (last 6 months)</h3>
      <p className="mb-4 text-xs text-ink-400">{total} total signups</p>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height: '160px' }}>
        {data.map(d => {
          const pct = maxVal > 0 ? (d.count / maxVal) * 100 : 0;
          const barH = Math.max(pct * 1.5, 8);
          return (
            <div key={d._id} className="flex flex-1 flex-col items-center justify-end gap-1.5 h-full">
              <span className="text-xs font-semibold text-ink-900">{d.count}</span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-500"
                style={{ height: `${barH}px`, maxHeight: '100%' }}
              />
              <span className="text-[10px] text-ink-500">{d._id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Section: Users ────────────────────────────────────────────── */
function UsersSection({ data, search, onSearch, role, onRole, page, onPage, onView, onEdit, onDelete, onSuspend }) {
  const roles = ['', 'student', 'corper', 'landlord', 'admin'];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm text-ink-500">
          {data.total > 0 ? <><span className="font-semibold text-ink-900">{data.total}</span> total users</> : ''}
        </p>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search users..." value={search} onChange={e => { onSearch(e.target.value); onPage(1); }} />
        </div>
        <select className="input w-full sm:w-44" value={role} onChange={e => { onRole(e.target.value); onPage(1); }}>
          <option value="">All roles</option>
          {roles.slice(1).map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      {data.items.length === 0 ? <EmptyState message="No users found" icon="users" />
        : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-100 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Trust</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.items.map(u => (
                    <tr key={u._id} className="hover:bg-cream-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">
                            {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-ink-900">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-500">{u.email}</td>
                      <td className="px-4 py-3"><span className={`role-${u.role}`}>{u.role}</span></td>
                      <td className="px-4 py-3">
                        {u.suspended ? <span className="badge-danger">Suspended</span>
                          : u.verificationStatus === 'approved' ? <span className="badge">Verified</span>
                          : u.verificationStatus === 'submitted' ? <span className="badge-warn">Pending</span>
                          : <span className="badge-gray">Unverified</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-500">{u.trustScore ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-500">{shortDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => onView(u._id)} className="btn-ghost text-xs px-2.5 py-1.5">View</button>
                          <button onClick={() => onEdit(u)} className="btn-outline text-xs px-2.5 py-1.5">Edit</button>
                          {!u.suspended && u.role !== 'admin' && (
                            <button onClick={() => onSuspend(u._id, u.fullName)} className="btn-danger text-xs px-2.5 py-1.5">Suspend</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {data.items.map(u => (
                <div key={u._id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
                      {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-900 truncate">{u.fullName}</p>
                      <p className="text-xs text-ink-500 truncate">{u.email}</p>
                    </div>
                    <span className={`role-${u.role} shrink-0`}>{u.role}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {u.suspended ? <span className="badge-danger">Suspended</span>
                      : u.verificationStatus === 'approved' ? <span className="badge">Verified</span>
                      : u.verificationStatus === 'submitted' ? <span className="badge-warn">Pending</span>
                      : <span className="badge-gray">Unverified</span>}
                    <span className="text-xs text-ink-400">Trust: {u.trustScore ?? '—'}</span>
                    <span className="text-xs text-ink-400">{shortDate(u.createdAt)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => onView(u._id)} className="btn-ghost flex-1 text-xs">View</button>
                    <button onClick={() => onEdit(u)} className="btn-outline flex-1 text-xs">Edit</button>
                    {!u.suspended && u.role !== 'admin' && (
                      <button onClick={() => onSuspend(u._id, u.fullName)} className="btn-danger flex-1 text-xs">Suspend</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} pages={data.pages} onChange={onPage} />
          </>
        )}
    </div>
  );
}

/* ─── Section: Properties ────────────────────────────────────────── */
function PropertiesSection({ data, search, onSearch, status, onStatus, page, onPage, doAction }) {
  const statuses = ['', 'active', 'pending_review', 'rejected', 'rented', 'draft', 'archived'];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search properties..." value={search} onChange={e => { onSearch(e.target.value); onPage(1); }} />
        </div>
        <select className="input w-full sm:w-44" value={status} onChange={e => { onStatus(e.target.value); onPage(1); }}>
          <option value="">All statuses</option>
          {statuses.slice(1).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {data.items.length === 0 ? <EmptyState message="No properties found" icon="properties" />
        : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-100 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Landlord</th>
                    <th className="px-4 py-3">Rent</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.items.map(p => (
                    <tr key={p._id} className="hover:bg-cream-50">
                      <td className="max-w-xs truncate px-4 py-3 font-medium text-ink-900">{p.title}</td>
                      <td className="px-4 py-3 text-ink-500">{p.landlord?.fullName || '—'}</td>
                      <td className="px-4 py-3 font-medium">{naira(p.annualRent)}</td>
                      <td className="px-4 py-3">
                        {p.status === 'active' ? <span className="badge">Active</span>
                          : p.status === 'pending_review' ? <span className="badge-warn">Pending Review</span>
                          : p.status === 'rejected' ? <span className="badge-danger">Rejected</span>
                          : p.status === 'rented' ? <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Rented</span>
                          : <span className="badge-gray">{p.status}</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-500">{shortDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'pending_review' && (
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => doAction(`/admin/listings/${p._id}`, 'Listing approved', true)} className="btn-primary text-xs px-2.5 py-1.5">Approve</button>
                            <button onClick={() => doAction(`/admin/listings/${p._id}`, 'Listing rejected', true)} className="btn-outline text-xs px-2.5 py-1.5">Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {data.items.map(p => (
                <div key={p._id} className="card">
                  <div className="flex items-start justify-between">
                    <p className="max-w-[75%] truncate font-medium text-ink-900">{p.title}</p>
                    {p.status === 'active' ? <span className="badge">Active</span>
                      : p.status === 'pending_review' ? <span className="badge-warn">Pending</span>
                      : p.status === 'rejected' ? <span className="badge-danger">Rejected</span>
                      : <span className="badge-gray">{p.status}</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                    <span>{p.landlord?.fullName || '—'}</span>
                    <span className="font-medium text-ink-900">{naira(p.annualRent)}</span>
                    <span>{shortDate(p.createdAt)}</span>
                  </div>
                  {p.status === 'pending_review' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => doAction(`/admin/listings/${p._id}`, 'Listing approved')} className="btn-primary flex-1 text-xs">Approve</button>
                      <button onClick={() => doAction(`/admin/listings/${p._id}`, 'Listing rejected')} className="btn-outline flex-1 text-xs">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Pagination page={page} pages={data.pages} onChange={onPage} />
          </>
        )}
    </div>
  );
}

/* ─── Section: Verifications ─────────────────────────────────────── */
function VerificationsSection({ data, doAction }) {
  if (data.items.length === 0) return <EmptyState message="No pending verifications" icon="verifications" />;

  return (
    <div className="space-y-3">
      {data.items.map(u => (
        <div key={u._id} className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-ink-900">{u.fullName} <span className={`role-${u.role} ml-2`}>{u.role}</span></p>
              <p className="mt-0.5 text-sm text-ink-500">{u.email}</p>
              {u.documents?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {u.documents.map((d, i) => (
                    <a key={i} href={d.url} target="_blank" className="badge-gray inline-flex items-center gap-1" rel="noreferrer">
                      {d.kind} <Icon name="external" className="h-3 w-3" />
                    </a>
                  ))}
                  {u.selfieUrl && (
                    <a href={u.selfieUrl} target="_blank" className="badge-gray inline-flex items-center gap-1" rel="noreferrer">
                      Selfie <Icon name="external" className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => doAction(`/admin/verifications/${u._id}`, `${u.fullName.split(' ')[0]} rejected`, true, { decision: 'reject' })} className="btn-outline flex-1 sm:flex-initial">Reject</button>
              <button onClick={() => doAction(`/admin/verifications/${u._id}`, `${u.fullName.split(' ')[0]} approved`, true, { decision: 'approve' })} className="btn-primary flex-1 sm:flex-initial">Approve</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Section: Disputes ──────────────────────────────────────────── */
function DisputesSection({ data, doAction }) {
  if (data.items.length === 0) return <EmptyState message="No open disputes" icon="disputes" />;

  return (
    <div className="space-y-3">
      {data.items.map(p => (
        <div key={p._id} className="card">
          <p className="font-medium text-ink-900">{p.property?.title || 'Unknown property'}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
            <span>Tenant: {p.tenant?.fullName || '—'}</span>
            <span>Landlord: {p.landlord?.fullName || '—'}</span>
          </div>
          {p.disputeReason && (
            <p className="mt-2 text-sm italic text-ink-700">"{p.disputeReason}"</p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button onClick={() => doAction(`/admin/disputes/${p._id}`, 'Refunded to tenant')} className="btn-danger flex-1 text-xs sm:flex-initial">Refund tenant</button>
            <button onClick={() => doAction(`/admin/disputes/${p._id}`, 'Released to landlord')} className="btn-outline flex-1 text-xs sm:flex-initial">Release to landlord</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Section: Fraud ─────────────────────────────────────────────── */
function FraudSection({ data, onSuspend }) {
  if (data.items.length === 0) return <EmptyState message="No flagged conversations" icon="fraud" />;

  return (
    <div className="space-y-3">
      {data.items.map(c => (
        <div key={c._id} className="card">
          <p className="font-medium text-ink-900">{c.property?.title || 'Unknown property'}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {c.participants?.map(p => (
              <span key={p._id} className={`role-${p.role} text-xs`}>
                {p.fullName} <span className="opacity-60">({p.bypassWarnings || 0} warns)</span>
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="badge-warn">{c.bypassAttempts || 0} blocked attempts</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.participants?.map(p => (
              <button key={p._id} onClick={() => onSuspend(p._id, p.fullName)} className="btn-danger text-xs px-3 py-1.5">
                Suspend {p.fullName.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Section: Audit Log ─────────────────────────────────────────── */
function AuditSection({ data }) {
  if (data.items?.length === 0) return <EmptyState message="No audit entries" icon="audit" />;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-100 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {data.items.map(a => (
              <tr key={a._id} className="hover:bg-cream-50">
                <td className="whitespace-nowrap px-4 py-3 text-ink-500">{shortDate(a.createdAt)}</td>
                <td className="px-4 py-3 font-medium text-ink-900">{a.actor?.fullName || 'System'}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-700">{a.action}</code>
                </td>
                <td className="px-4 py-3 text-ink-500">{a.target?.kind ? `${a.target.kind}:${a.target.id?.slice(-6)}` : '—'}</td>
                <td className="px-4 py-3">
                  {a.outcome === 'success' ? <span className="badge">Success</span>
                    : a.outcome === 'failure' ? <span className="badge-danger">Failure</span>
                    : <span className="badge-gray">{a.outcome || '—'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.items.map(a => (
          <div key={a._id} className="card">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink-900">{a.actor?.fullName || 'System'}</p>
              {a.outcome === 'success' ? <span className="badge">Success</span>
                : a.outcome === 'failure' ? <span className="badge-danger">Failure</span>
                : <span className="badge-gray">{a.outcome || '—'}</span>}
            </div>
            <code className="mt-1.5 inline-block rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-700">{a.action}</code>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-500">
              <span>{shortDate(a.createdAt)}</span>
              {a.target?.kind && <span>{a.target.kind}:{a.target.id?.slice(-6)}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── User Detail Modal ──────────────────────────────────────────── */
function UserDetailModal({ user, payments, loading, onClose, onEdit, onDelete }) {
  const [tab, setTab] = useState('profile');

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lift" onClick={e => e.stopPropagation()}>
          <LoadingSkeleton rows={8} />
        </div>
      </div>
    );
  }
  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'verification', label: 'Verification' },
    { id: 'role', label: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Info` },
    { id: 'wallet', label: 'Wallet' },
    { id: 'payments', label: `Payments (${payments.length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 pt-8 backdrop-blur-sm sm:p-6 sm:pt-12" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-lift" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
              {user.fullName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="font-bold font-display text-ink-900">{user.fullName}</h3>
              <p className="text-xs text-ink-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.suspended && <span className="badge-danger">Suspended</span>}
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink-100">
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-ink-200 px-5 py-2 sm:px-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                tab === t.id ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 sm:px-6">
          {tab === 'profile' && (
            <div className="space-y-4">
              <Section label="Basic Information">
                <Row label="Full Name" value={user.fullName} />
                <Row label="Email" value={user.email} />
                <Row label="Phone" value={user.phone || '—'} />
                <Row label="Role" value={<span className={`role-${user.role}`}>{user.role}</span>} />
                <Row label="Member Since" value={shortDate(user.createdAt)} />
              </Section>
              <Section label="Account Status">
                <Row label="Email Verified" value={user.isEmailVerified ? <span className="badge">Yes</span> : <span className="badge-gray">No</span>} />
                <Row label="Suspended" value={user.suspended ? <span className="badge-danger">{user.suspensionReason || 'Yes'}</span> : <span className="badge">No</span>} />
                <Row label="Bypass Warnings" value={user.bypassWarnings ?? 0} />
              </Section>
              <Section label="Reputation">
                <Row label="Trust Score" value={user.trustScore ?? 50} />
                <Row label="Badges" value={user.badges?.length > 0 ? user.badges.map(b => <span key={b} className="badge mr-1">{b}</span>) : <span className="text-ink-400">None</span>} />
              </Section>
            </div>
          )}

          {tab === 'verification' && (
            <div className="space-y-4">
              <Section label="Verification Status">
                <Row label="Status" value={
                  user.verificationStatus === 'approved' ? <span className="badge">Approved</span>
                  : user.verificationStatus === 'submitted' ? <span className="badge-warn">Submitted</span>
                  : user.verificationStatus === 'rejected' ? <span className="badge-danger">Rejected</span>
                  : <span className="badge-gray">Pending</span>
                } />
                {user.verificationNotes && <Row label="Notes" value={user.verificationNotes} />}
              </Section>
              {user.documents?.length > 0 && (
                <Section label="Documents">
                  {user.documents.map((d, i) => (
                    <Row key={i} label={d.kind} value={<a href={d.url} target="_blank" className="text-brand-600 underline hover:text-brand-700" rel="noreferrer">View document <Icon name="external" className="inline h-3 w-3" /></a>} />
                  ))}
                </Section>
              )}
              {user.selfieUrl && (
                <Section label="Selfie">
                  <a href={user.selfieUrl} target="_blank" rel="noreferrer">
                    <img src={user.selfieUrl} alt="Selfie" className="h-24 w-24 rounded-xl object-cover shadow-soft" />
                  </a>
                  {user.selfieMatchScore != null && <Row label="Selfie Match" value={`${user.selfieMatchScore}%`} />}
                </Section>
              )}
              {user.livenessScore != null && (
                <Section label="Liveness">
                  <Row label="Score" value={`${user.livenessScore}%`} />
                  <Row label="Passed" value={user.livenessPassed ? <span className="badge">Yes</span> : <span className="badge-danger">No</span>} />
                </Section>
              )}
            </div>
          )}

          {tab === 'role' && (
            <div className="space-y-4">
              {user.role === 'student' && (
                <Section label="Student Information">
                  <Row label="School" value={user.student?.schoolName || '—'} />
                  <Row label="School Email" value={user.student?.schoolEmail || '—'} />
                  <Row label="Email Verified" value={user.student?.schoolEmailVerified ? <span className="badge">Yes</span> : <span className="badge-gray">No</span>} />
                  <Row label="Department" value={user.student?.department || '—'} />
                  <Row label="Matric Number" value={user.student?.matricNumber || '—'} />
                </Section>
              )}
              {user.role === 'corper' && (
                <Section label="Corper Information">
                  <Row label="NIN Verified" value={user.corper?.ninVerified ? <span className="badge">Yes</span> : <span className="badge-gray">No</span>} />
                  <Row label="State Code" value={user.corper?.stateCode || '—'} />
                  <Row label="State of Service" value={user.corper?.stateOfService || '—'} />
                </Section>
              )}
              {user.role === 'landlord' && (
                <Section label="Landlord Information">
                  <Row label="NIN Verified" value={user.landlord?.ninVerified ? <span className="badge">Yes</span> : <span className="badge-gray">No</span>} />
                  <Row label="Admin Approved" value={user.landlord?.adminApproved ? <span className="badge">Yes</span> : <span className="badge-warn">Pending</span>} />
                  <Row label="Bank Name" value={user.landlord?.bankName || '—'} />
                  <Row label="Account Name" value={user.landlord?.accountName || '—'} />
                  <Row label="Account Number" value={user.landlord?.accountNumber || '—'} />
                  <Row label="Bank Code" value={user.landlord?.bankCode || '—'} />
                </Section>
              )}
              {user.role === 'admin' && (
                <p className="text-sm text-ink-500">Admin account — no additional role information.</p>
              )}
            </div>
          )}

          {tab === 'wallet' && (
            <div className="space-y-4">
              <Section label="Wallet">
                <Row label="Balance" value={<span className="text-lg font-bold text-brand-700">{naira(user.wallet?.balance || 0)}</span>} />
              </Section>
              {user.wallet?.transactions?.length > 0 && (
                <Section label="Recent Transactions">
                  {user.wallet.transactions.slice(-10).reverse().map((tx, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
                      <div>
                        <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}>{tx.type === 'credit' ? '+' : '-'}{naira(tx.amount)}</span>
                        <p className="text-xs text-ink-400">{tx.reason || '—'} {tx.at ? `· ${shortDate(tx.at)}` : ''}</p>
                      </div>
                      <span className="text-xs text-ink-400">Ref: {tx.ref?.slice(-8) || '—'}</span>
                    </div>
                  ))}
                </Section>
              )}
              {(!user.wallet?.transactions || user.wallet.transactions.length === 0) && (
                <p className="text-sm text-ink-500">No transactions yet.</p>
              )}
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-3">
              {payments.length === 0 ? (
                <p className="text-sm text-ink-500">No payments found for this user.</p>
              ) : (
                payments.map(p => (
                  <div key={p._id} className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-ink-900">{p.property?.title || 'Unknown property'}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {p.tenant?._id === user._id ? 'As tenant' : 'As landlord'} · {naira(p.totalDue)}
                        </p>
                      </div>
                      {p.escrowStatus === 'fully_funded' ? <span className="badge">Funded</span>
                        : p.escrowStatus === 'released' ? <span className="badge">Released</span>
                        : p.escrowStatus === 'refunded' ? <span className="badge-gray">Refunded</span>
                        : p.escrowStatus === 'disputed' ? <span className="badge-warn">Disputed</span>
                        : <span className="badge-gray">{p.escrowStatus}</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-400">
                      <span>Rent: {naira(p.rentAmount)}</span>
                      <span>Service: {naira(p.serviceCharge)}</span>
                      <span>Caution: {naira(p.cautionFee)}</span>
                      <span>Mode: {p.paymentMode}</span>
                      <span>{shortDate(p.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-ink-200 px-5 py-4 sm:px-6">
          <button onClick={() => onDelete(user._id, user.fullName)} className="btn-danger text-xs px-3 py-1.5">Delete user</button>
          <button onClick={onEdit} className="btn-primary text-sm">Edit profile</button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</h4>
      <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className="ml-4 text-right font-medium text-ink-900">{value}</span>
    </div>
  );
}

/* ─── User Edit Modal ───────────────────────────────────────────── */
function UserEditModal({ data, onChange, onSave, onClose }) {
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    onChange({ ...data, [field]: value });
  }

  function setNested(obj, field, value) {
    onChange({ ...data, [obj]: { ...data[obj], [field]: value } });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 pt-8 backdrop-blur-sm sm:p-6 sm:pt-12" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-lift" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4 sm:px-6">
          <h3 className="font-bold font-display text-ink-900">Edit User</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink-100">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="max-h-[65vh] overflow-y-auto px-5 py-4 sm:px-6">
          <div className="space-y-4">
            <Field label="Full Name" value={data.fullName} onChange={v => set('fullName', v)} />
            <Field label="Email" value={data.email} onChange={v => set('email', v)} type="email" />
            <Field label="Phone" value={data.phone || ''} onChange={v => set('phone', v)} />

            <div>
              <label className="label">Role</label>
              <select className="input" value={data.role} onChange={e => set('role', e.target.value)}>
                {['student', 'corper', 'landlord', 'admin'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Verification Status</label>
              <select className="input" value={data.verificationStatus || 'pending'} onChange={e => set('verificationStatus', e.target.value)}>
                {['pending', 'submitted', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            {data.verificationStatus === 'rejected' && (
              <Field label="Verification Notes" value={data.verificationNotes || ''} onChange={v => set('verificationNotes', v)} />
            )}

            <div className="flex items-center gap-3">
              <label className="label mb-0">Suspended</label>
              <input type="checkbox" checked={!!data.suspended} onChange={e => set('suspended', e.target.checked)} className="h-5 w-5 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
              {data.suspended && (
                <input className="input flex-1" placeholder="Reason" value={data.suspensionReason || ''} onChange={e => set('suspensionReason', e.target.value)} />
              )}
            </div>

            <div>
              <label className="label">Trust Score (0–100)</label>
              <input className="input" type="number" min="0" max="100" value={data.trustScore ?? 50} onChange={e => set('trustScore', Number(e.target.value))} />
            </div>

            <div>
              <label className="label">Badges (comma-separated)</label>
              <input className="input" value={(data.badges || []).join(', ')} onChange={e => set('badges', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            </div>

            {data.role === 'student' && (
              <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Student Info</p>
                <Field label="School Name" value={data.student?.schoolName || ''} onChange={v => setNested('student', 'schoolName', v)} />
                <Field label="School Email" value={data.student?.schoolEmail || ''} onChange={v => setNested('student', 'schoolEmail', v)} />
                <Field label="Department" value={data.student?.department || ''} onChange={v => setNested('student', 'department', v)} />
                <Field label="Matric Number" value={data.student?.matricNumber || ''} onChange={v => setNested('student', 'matricNumber', v)} />
              </div>
            )}

            {data.role === 'corper' && (
              <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Corper Info</p>
                <Field label="State Code" value={data.corper?.stateCode || ''} onChange={v => setNested('corper', 'stateCode', v)} />
                <Field label="State of Service" value={data.corper?.stateOfService || ''} onChange={v => setNested('corper', 'stateOfService', v)} />
              </div>
            )}

            {data.role === 'landlord' && (
              <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Landlord Info</p>
                <Field label="Bank Name" value={data.landlord?.bankName || ''} onChange={v => setNested('landlord', 'bankName', v)} />
                <Field label="Account Name" value={data.landlord?.accountName || ''} onChange={v => setNested('landlord', 'accountName', v)} />
                <Field label="Account Number" value={data.landlord?.accountNumber || ''} onChange={v => setNested('landlord', 'accountNumber', v)} />
                <div>
                  <label className="label">Admin Approved</label>
                  <select className="input" value={data.landlord?.adminApproved ? 'true' : 'false'} onChange={e => setNested('landlord', 'adminApproved', e.target.value === 'true')}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="flex justify-end gap-2 border-t border-ink-200 px-5 py-4 sm:px-6">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner" /> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

/* ─── Confirm Action Dialog (2-step) ───────────────────────────── */
function ConfirmActionDialog({ action, onChange, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  function handleContinue() {
    onChange({ ...action, step: 2 });
  }

  async function handleConfirm() {
    if (action.input !== action.word) return;
    setSubmitting(true);
    await action.onConfirm();
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift" onClick={e => e.stopPropagation()}>
        {action.step === 1 ? (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
              <Icon name="warning" className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-center text-lg font-bold font-display text-ink-900">{action.title}</h3>
            <p className="mb-6 text-center text-sm text-ink-600">{action.message}</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleContinue} className="btn-danger flex-1">Continue</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-1 text-lg font-bold font-display text-ink-900">Confirm {action.title.toLowerCase()}</h3>
            <p className="mb-4 text-sm text-ink-600">
              Type <strong className="text-red-600">{action.word}</strong> below to confirm.
            </p>
            <input
              className="input mb-4 text-center text-lg font-bold tracking-widest uppercase"
              placeholder={action.word}
              value={action.input}
              onChange={e => onChange({ ...action, input: e.target.value })}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={action.input !== action.word || submitting}
                className="btn-danger flex-1"
              >
                {submitting ? <span className="spinner" /> : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Pagination ─────────────────────────────────────────────────── */
function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const items = paginate(page, pages);

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="grid h-9 w-9 place-items-center rounded-lg text-sm text-ink-600 hover:bg-ink-100 disabled:opacity-30"
      >
        <Icon name="arrowUp" className="h-4 w-4 -rotate-90" />
      </button>
      {items.map((n, i) =>
        n === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-xs text-ink-400">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`grid h-9 min-w-[2.25rem] place-items-center rounded-lg text-sm font-medium ${
              n === page ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            {n}
          </button>
        )
      )}
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="grid h-9 w-9 place-items-center rounded-lg text-sm text-ink-600 hover:bg-ink-100 disabled:opacity-30"
      >
        <Icon name="arrowDown" className="h-4 w-4 -rotate-90" />
      </button>
    </div>
  );
}
