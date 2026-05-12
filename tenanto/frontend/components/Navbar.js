import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { clearAuth, getUser } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getUser()); }, [router.pathname]);

  function logout() {
    clearAuth();
    router.push('/');
  }

  const dashHref = user?.role === 'admin' ? '/dashboard/admin'
                 : user?.role === 'landlord' ? '/dashboard/landlord'
                 : '/dashboard/tenant';

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">T</span>
          Tenanto
        </Link>
        <nav className="hidden gap-6 text-sm md:flex">
          <Link href="/listings" className="hover:text-brand-700">Browse</Link>
          {user && ['student', 'corper'].includes(user.role) && <Link href="/roommates" className="hover:text-brand-700">Roommates</Link>}
          {user && <Link href="/chat" className="hover:text-brand-700">Messages</Link>}
          {user && <Link href={dashHref} className="hover:text-brand-700">Dashboard</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-gray-600 sm:inline">{user.fullName}</span>
              <button onClick={logout} className="btn-outline">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline">Sign in</Link>
              <Link href="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
