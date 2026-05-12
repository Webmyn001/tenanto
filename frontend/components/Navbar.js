import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { clearAuth, getUser } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { setUser(getUser()); setOpen(false); }, [router.pathname]);

  function logout() { clearAuth(); router.push('/'); }

  const dashHref = user?.role === 'admin' ? '/dashboard/admin'
                 : user?.role === 'landlord' ? '/dashboard/landlord'
                 : '/dashboard/tenant';

  const navLinks = (
    <>
      <Link href="/listings" className="hover:text-brand-700">Browse</Link>
      {user && ['student', 'corper'].includes(user.role) && <Link href="/roommates" className="hover:text-brand-700">Roommates</Link>}
      {user && <Link href="/chat" className="hover:text-brand-700">Messages</Link>}
      {user && <Link href={dashHref} className="hover:text-brand-700">Dashboard</Link>}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-cream-50/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display font-extrabold text-brand-800">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-soft">T</span>
          <span className="text-lg">Tenanto</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 md:flex">
          {navLinks}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-ink-500 lg:inline">Hi, {user.fullName.split(' ')[0]}</span>
              <button onClick={logout} className="btn-outline">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <Link href="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-ink-100 md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> :
                    <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-ink-200 bg-cream-50 md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3 text-base font-medium">
            {navLinks}
            <hr className="my-2 border-ink-200" />
            {user ? (
              <>
                <span className="px-1 py-1 text-sm text-ink-500">Signed in as <b className="text-ink-900">{user.fullName}</b></span>
                <button onClick={logout} className="btn-outline w-full">Sign out</button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="btn-outline flex-1">Sign in</Link>
                <Link href="/register" className="btn-primary flex-1">Get started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
