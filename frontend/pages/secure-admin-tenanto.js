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
  const [usersData, setUsersData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [propsData, setPropsData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [verifications, setVerifications] = useState({ items: [] });
  const [disputes, setDisputes] = useState({ items: [] });
  const [fraud, setFraud] = useState({ items: [] });
  const [audit, setAudit] = useState({ items: [] });

  const [sectionLoading, setSectionLoading] = useState(false);
  const [globalMsg, setGlobalMsg] = useState(null);

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
            const { data } = await api.get('/admin/analytics');
            setAnalytics(data);
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

  async function doAction(url, successMsg, reload = true) {
    try {
      await api.post(url);
      if (reload) fetchSection(activeSection);
      setGlobalMsg({ type: 'success', text: successMsg });
      setTimeout(() => setGlobalMsg(null), 3000);
    } catch (err) {
      setGlobalMsg({ type: 'error', text: err?.response?.data?.error || 'Action failed' });
    }
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
              {activeSection === 'overview' && <OverviewSection analytics={analytics} />}
              {activeSection === 'users' && (
                <UsersSection
                  data={usersData}
                  search={searchUser}
                  onSearch={setSearchUser}
                  role={userRole}
                  onRole={setUserRole}
                  page={userPage}
                  onPage={setUserPage}
                  doAction={doAction}
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
                <FraudSection data={fraud} doAction={doAction} />
              )}
              {activeSection === 'audit' && <AuditSection data={audit} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ─── Section: Overview ─────────────────────────────────────────── */
function OverviewSection({ analytics }) {
  const cards = [
    { label: 'Total Users', value: analytics?.users, icon: 'users', color: 'brand' },
    { label: 'Total Properties', value: analytics?.listings, icon: 'properties', color: 'blue' },
    { label: 'Active Listings', value: analytics?.activeListings, icon: 'properties', color: 'green' },
    { label: 'Payments', value: analytics?.payments, icon: 'dashboard', color: 'violet' },
    { label: 'In Escrow', value: analytics ? naira(analytics.escrowedNaira) : null, icon: 'dashboard', color: 'accent' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map(c => <StatCard key={c.label} {...c} />)}
    </div>
  );
}

/* ─── Section: Users ────────────────────────────────────────────── */
function UsersSection({ data, search, onSearch, role, onRole, page, onPage, doAction }) {
  const roles = ['', 'student', 'corper', 'landlord', 'admin'];

  return (
    <div>
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
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.items.map(u => (
                    <tr key={u._id} className="hover:bg-cream-50">
                      <td className="px-4 py-3 font-medium text-ink-900">{u.fullName}</td>
                      <td className="px-4 py-3 text-ink-500">{u.email}</td>
                      <td className="px-4 py-3"><span className={`role-${u.role}`}>{u.role}</span></td>
                      <td className="px-4 py-3">
                        {u.suspended ? <span className="badge-danger">Suspended</span>
                          : u.verificationStatus === 'approved' ? <span className="badge">Verified</span>
                          : u.verificationStatus === 'submitted' ? <span className="badge-warn">Pending</span>
                          : <span className="badge-gray">Unverified</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-500">{shortDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {!u.suspended && u.role !== 'admin' && (
                          <button onClick={() => doAction(`/admin/users/${u._id}/suspend`, `${u.fullName.split(' ')[0]} suspended`)} className="btn-danger text-xs px-3 py-1.5">Suspend</button>
                        )}
                        {u.suspended && <span className="text-xs text-ink-400">Suspended</span>}
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
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-ink-900">{u.fullName}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{u.email}</p>
                    </div>
                    <span className={`role-${u.role}`}>{u.role}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {u.suspended ? <span className="badge-danger">Suspended</span>
                        : u.verificationStatus === 'approved' ? <span className="badge">Verified</span>
                        : u.verificationStatus === 'submitted' ? <span className="badge-warn">Pending</span>
                        : <span className="badge-gray">Unverified</span>}
                      <span className="text-xs text-ink-400">{shortDate(u.createdAt)}</span>
                    </div>
                    {!u.suspended && u.role !== 'admin' && (
                      <button onClick={() => doAction(`/admin/users/${u._id}/suspend`, `${u.fullName.split(' ')[0]} suspended`)} className="btn-danger text-xs px-3 py-1.5">Suspend</button>
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
              <button onClick={() => doAction(`/admin/verifications/${u._id}`, `${u.fullName.split(' ')[0]} rejected`, true)} className="btn-outline flex-1 sm:flex-initial">Reject</button>
              <button onClick={() => doAction(`/admin/verifications/${u._id}`, `${u.fullName.split(' ')[0]} approved`, true)} className="btn-primary flex-1 sm:flex-initial">Approve</button>
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
function FraudSection({ data, doAction }) {
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
              <button key={p._id} onClick={() => doAction(`/admin/users/${p._id}/suspend`, `${p.fullName.split(' ')[0]} suspended`)} className="btn-danger text-xs px-3 py-1.5">
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
