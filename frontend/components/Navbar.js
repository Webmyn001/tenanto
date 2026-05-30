import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api, { clearAuth, getUser } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { setUser(getUser()); setOpen(false); }, [router.pathname]);

  useEffect(() => {
    if (!user) return;
    api.get('/chat/unread-count').then(({ data }) => setUnreadCount(data.count)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/chat/unread-count').then(({ data }) => setUnreadCount(data.count)).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  function logout() { clearAuth(); router.push('/'); }

  const dashHref = user?.role === 'admin' ? '/dashboard/admin'
                 : user?.role === 'landlord' ? '/dashboard/landlord'
                 : '/dashboard/tenant';

  const navLinks = [
    { href: '/listings', label: 'Browse', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ...(user && ['student', 'corper'].includes(user.role) ? [{ href: '/roommates', label: 'Roommates', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }] : []),
    ...(user ? [{ href: '/chat', label: 'Messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' }] : []),
    ...(user ? [{ href: dashHref, label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' }] : []),
    ...(user ? [{ href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display font-extrabold text-brand-800">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-lg shadow-brand-200">T</span>
            <span className="text-lg tracking-tight">Tenanto</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 text-sm font-semibold text-ink-700 md:flex">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className={`relative transition-colors hover:text-brand-700 ${router.pathname === l.href || (l.href !== '/' && router.pathname.startsWith(l.href)) ? 'text-brand-700' : ''}`}>
                {l.label}
                {l.label === 'Messages' && unreadCount > 0 && (
                  <span className="absolute -right-3.5 -top-2.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <span className="text-sm text-ink-500">Hi, <span className="font-semibold text-ink-900">{user.fullName.split(' ')[0]}</span></span>
                <button onClick={logout} className="btn-outline text-xs">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-xs">Sign in</Link>
                <Link href="/register" className="btn-primary text-xs">Get started</Link>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="grid h-10 w-10 place-items-center rounded-xl transition-colors hover:bg-ink-100 md:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-700">
              {open ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> :
                      <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile full-screen overlay — completely independent, no parent constraints */}
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white md:hidden">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 font-display font-extrabold text-brand-800">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-lg">T</span>
              <span className="text-lg tracking-tight">Tenanto</span>
            </Link>
            <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-ink-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-700">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 space-y-2 overflow-y-auto px-5 py-8">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-4 rounded-xl px-5 py-4 text-lg font-semibold transition-all duration-150 ${
                  router.pathname === l.href || (l.href !== '/' && router.pathname.startsWith(l.href))
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900'
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d={l.icon} />
                </svg>
                <span className="flex-1">{l.label}</span>
                {l.label === 'Messages' && unreadCount > 0 && (
                  <span className="flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold leading-none text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-ink-100 px-5 py-6">
            {user ? (
              <div className="space-y-3">
                <p className="text-center text-sm text-ink-500">Signed in as <span className="font-semibold text-ink-900">{user.fullName}</span></p>
                <button onClick={logout} className="btn-outline w-full justify-center">Sign out</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link href="/login" onClick={() => setOpen(false)} className="btn-outline flex-1 justify-center text-base">Sign in</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-primary flex-1 justify-center text-base">Get started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}