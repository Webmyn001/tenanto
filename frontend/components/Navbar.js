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
          <Link href="/" className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -105.0 555.4 142.0" className="h-8 w-auto">
              <g transform="translate(0,-104.8) scale(0.40605) translate(-118,-122)">
                <g fill="#0B8A5C" fill-rule="evenodd">
                  <path d="M138 130 H374 Q386 130 386 142 V176 Q386 188 374 188 H138 Q126 188 126 176 V142 Q126 130 138 130 Z M177 159 A14 14 0 1 0 149 159 A14 14 0 1 0 177 159 Z"/>
                  <path d="M228 186 H284 V382 Q284 388 278 388 H234 Q228 388 228 382 Z"/>
                  <path d="M282 306 H319 Q324 306 324 311 V328 Q324 333 319 333 H282 Z"/>
                  <path d="M282 352 H319 Q324 352 324 357 V374 Q324 379 319 379 H282 Z"/>
                </g>
              </g>
              <path d="M31.6 0.7Q23.9 0.7 19.0 -1.25Q14.1 -3.2 11.75 -7.9Q9.4 -12.6 9.4 -20.6V-69.6H22.8V-19.7Q22.8 -15.8 24.9 -13.65Q27.0 -11.5 31.0 -11.5H39.4V0.7ZM0.9 -43.9V-54.4H39.4V-43.9Z M73.8 1.9Q66.8 1.9 61.55 -0.5Q56.3 -2.9 52.85 -6.95Q49.4 -11.0 47.6 -16.0Q45.8 -21.0 45.8 -26.2V-28.1Q45.8 -33.6 47.6 -38.6Q49.4 -43.6 52.8 -47.6Q56.2 -51.6 61.35 -53.95Q66.5 -56.3 73.2 -56.3Q82.0 -56.3 87.95 -52.4Q93.9 -48.5 96.95 -42.25Q100.0 -36.0 100.0 -28.8V-23.6H51.9V-32.3H91.1L86.7 -28.1Q86.7 -33.2 85.2 -36.9Q83.7 -40.6 80.7 -42.55Q77.7 -44.5 73.2 -44.5Q68.7 -44.5 65.55 -42.4Q62.4 -40.3 60.8 -36.45Q59.2 -32.6 59.2 -27.1Q59.2 -22.0 60.75 -18.15Q62.3 -14.3 65.55 -12.1Q68.8 -9.9 73.8 -9.9Q78.8 -9.9 81.9 -11.85Q85.0 -13.8 85.9 -16.7H99.1Q97.9 -11.2 94.5 -6.95Q91.1 -2.7 85.85 -0.4Q80.6 1.9 73.8 1.9Z M110.3 0.0V-54.4H121.6V-31.0H120.6Q120.6 -39.3 122.8 -44.9Q125.0 -50.5 129.35 -53.3Q133.7 -56.1 140.2 -56.1H140.8Q150.5 -56.1 155.5 -49.85Q160.5 -43.6 160.5 -31.1V0.0H146.2V-32.3Q146.2 -37.2 143.4 -40.2Q140.6 -43.2 135.7 -43.2Q130.7 -43.2 127.65 -40.1Q124.6 -37.0 124.6 -31.9V0.0Z M206.9 0.0V-16.1H204.5V-34.0Q204.5 -38.5 202.25 -40.8Q200.0 -43.1 195.3 -43.1Q192.9 -43.1 189.4 -43.0Q185.9 -42.9 182.3 -42.75Q178.7 -42.6 175.8 -42.4V-54.5Q178.1 -54.7 181.0 -54.9Q183.9 -55.1 187.05 -55.15Q190.2 -55.2 192.9 -55.2Q201.3 -55.2 206.9 -52.95Q212.5 -50.7 215.35 -45.95Q218.2 -41.2 218.2 -33.6V0.0ZM189.4 1.4Q183.5 1.4 179.05 -0.7Q174.6 -2.8 172.15 -6.7Q169.7 -10.6 169.7 -16.1Q169.7 -22.1 172.65 -25.9Q175.6 -29.7 181.0 -31.6Q186.4 -33.5 193.6 -33.5H206.1V-25.1H193.5Q188.8 -25.1 186.3 -22.8Q183.8 -20.5 183.8 -16.8Q183.8 -13.2 186.3 -10.95Q188.8 -8.7 193.5 -8.7Q196.3 -8.7 198.7 -9.75Q201.1 -10.8 202.7 -13.3Q204.3 -15.8 204.5 -20.1L208.0 -16.2Q207.5 -10.5 205.25 -6.6Q203.0 -2.7 199.05 -0.65Q195.1 1.4 189.4 1.4Z M231.7 0.0V-54.4H243.0V-31.0H242.0Q242.0 -39.3 244.2 -44.9Q246.4 -50.5 250.75 -53.3Q255.1 -56.1 261.6 -56.1H262.2Q271.9 -56.1 276.9 -49.85Q281.9 -43.6 281.9 -31.1V0.0H267.6V-32.3Q267.6 -37.2 264.8 -40.2Q262.0 -43.2 257.1 -43.2Q252.1 -43.2 249.05 -40.1Q246.0 -37.0 246.0 -31.9V0.0Z M319.2 0.7Q311.5 0.7 306.6 -1.25Q301.7 -3.2 299.35 -7.9Q297.0 -12.6 297.0 -20.6V-69.6H310.4V-19.7Q310.4 -15.8 312.5 -13.65Q314.6 -11.5 318.6 -11.5H327.0V0.7ZM288.5 -43.9V-54.4H327.0V-43.9Z M363.2 1.9Q356.0 1.9 350.5 -0.4Q345.0 -2.7 341.15 -6.6Q337.3 -10.5 335.35 -15.5Q333.4 -20.5 333.4 -26.0V-28.1Q333.4 -33.7 335.45 -38.8Q337.5 -43.9 341.35 -47.85Q345.2 -51.8 350.75 -54.05Q356.3 -56.3 363.2 -56.3Q370.1 -56.3 375.6 -54.05Q381.1 -51.8 384.95 -47.85Q388.8 -43.9 390.85 -38.8Q392.9 -33.7 392.9 -28.1V-26.0Q392.9 -20.5 390.95 -15.5Q389.0 -10.5 385.2 -6.6Q381.4 -2.7 375.85 -0.4Q370.3 1.9 363.2 1.9ZM363.2 -10.3Q368.2 -10.3 371.6 -12.5Q375.0 -14.7 376.8 -18.5Q378.6 -22.3 378.6 -27.1Q378.6 -32.0 376.75 -35.8Q374.9 -39.6 371.45 -41.85Q368.0 -44.1 363.2 -44.1Q358.4 -44.1 354.9 -41.85Q351.4 -39.6 349.55 -35.8Q347.7 -32.0 347.7 -27.1Q347.7 -22.3 349.5 -18.5Q351.3 -14.7 354.75 -12.5Q358.2 -10.3 363.2 -10.3Z" transform="translate(143.5,0)" fill="#1E232B"/>
            </svg>
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
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -105.0 555.4 142.0" className="h-8 w-auto">
                <g transform="translate(0,-104.8) scale(0.40605) translate(-118,-122)">
                  <g fill="#0B8A5C" fill-rule="evenodd">
                    <path d="M138 130 H374 Q386 130 386 142 V176 Q386 188 374 188 H138 Q126 188 126 176 V142 Q126 130 138 130 Z M177 159 A14 14 0 1 0 149 159 A14 14 0 1 0 177 159 Z"/>
                    <path d="M228 186 H284 V382 Q284 388 278 388 H234 Q228 388 228 382 Z"/>
                    <path d="M282 306 H319 Q324 306 324 311 V328 Q324 333 319 333 H282 Z"/>
                    <path d="M282 352 H319 Q324 352 324 357 V374 Q324 379 319 379 H282 Z"/>
                  </g>
                </g>
                <path d="M31.6 0.7Q23.9 0.7 19.0 -1.25Q14.1 -3.2 11.75 -7.9Q9.4 -12.6 9.4 -20.6V-69.6H22.8V-19.7Q22.8 -15.8 24.9 -13.65Q27.0 -11.5 31.0 -11.5H39.4V0.7ZM0.9 -43.9V-54.4H39.4V-43.9Z M73.8 1.9Q66.8 1.9 61.55 -0.5Q56.3 -2.9 52.85 -6.95Q49.4 -11.0 47.6 -16.0Q45.8 -21.0 45.8 -26.2V-28.1Q45.8 -33.6 47.6 -38.6Q49.4 -43.6 52.8 -47.6Q56.2 -51.6 61.35 -53.95Q66.5 -56.3 73.2 -56.3Q82.0 -56.3 87.95 -52.4Q93.9 -48.5 96.95 -42.25Q100.0 -36.0 100.0 -28.8V-23.6H51.9V-32.3H91.1L86.7 -28.1Q86.7 -33.2 85.2 -36.9Q83.7 -40.6 80.7 -42.55Q77.7 -44.5 73.2 -44.5Q68.7 -44.5 65.55 -42.4Q62.4 -40.3 60.8 -36.45Q59.2 -32.6 59.2 -27.1Q59.2 -22.0 60.75 -18.15Q62.3 -14.3 65.55 -12.1Q68.8 -9.9 73.8 -9.9Q78.8 -9.9 81.9 -11.85Q85.0 -13.8 85.9 -16.7H99.1Q97.9 -11.2 94.5 -6.95Q91.1 -2.7 85.85 -0.4Q80.6 1.9 73.8 1.9Z M110.3 0.0V-54.4H121.6V-31.0H120.6Q120.6 -39.3 122.8 -44.9Q125.0 -50.5 129.35 -53.3Q133.7 -56.1 140.2 -56.1H140.8Q150.5 -56.1 155.5 -49.85Q160.5 -43.6 160.5 -31.1V0.0H146.2V-32.3Q146.2 -37.2 143.4 -40.2Q140.6 -43.2 135.7 -43.2Q130.7 -43.2 127.65 -40.1Q124.6 -37.0 124.6 -31.9V0.0Z M206.9 0.0V-16.1H204.5V-34.0Q204.5 -38.5 202.25 -40.8Q200.0 -43.1 195.3 -43.1Q192.9 -43.1 189.4 -43.0Q185.9 -42.9 182.3 -42.75Q178.7 -42.6 175.8 -42.4V-54.5Q178.1 -54.7 181.0 -54.9Q183.9 -55.1 187.05 -55.15Q190.2 -55.2 192.9 -55.2Q201.3 -55.2 206.9 -52.95Q212.5 -50.7 215.35 -45.95Q218.2 -41.2 218.2 -33.6V0.0ZM189.4 1.4Q183.5 1.4 179.05 -0.7Q174.6 -2.8 172.15 -6.7Q169.7 -10.6 169.7 -16.1Q169.7 -22.1 172.65 -25.9Q175.6 -29.7 181.0 -31.6Q186.4 -33.5 193.6 -33.5H206.1V-25.1H193.5Q188.8 -25.1 186.3 -22.8Q183.8 -20.5 183.8 -16.8Q183.8 -13.2 186.3 -10.95Q188.8 -8.7 193.5 -8.7Q196.3 -8.7 198.7 -9.75Q201.1 -10.8 202.7 -13.3Q204.3 -15.8 204.5 -20.1L208.0 -16.2Q207.5 -10.5 205.25 -6.6Q203.0 -2.7 199.05 -0.65Q195.1 1.4 189.4 1.4Z M231.7 0.0V-54.4H243.0V-31.0H242.0Q242.0 -39.3 244.2 -44.9Q246.4 -50.5 250.75 -53.3Q255.1 -56.1 261.6 -56.1H262.2Q271.9 -56.1 276.9 -49.85Q281.9 -43.6 281.9 -31.1V0.0H267.6V-32.3Q267.6 -37.2 264.8 -40.2Q262.0 -43.2 257.1 -43.2Q252.1 -43.2 249.05 -40.1Q246.0 -37.0 246.0 -31.9V0.0Z M319.2 0.7Q311.5 0.7 306.6 -1.25Q301.7 -3.2 299.35 -7.9Q297.0 -12.6 297.0 -20.6V-69.6H310.4V-19.7Q310.4 -15.8 312.5 -13.65Q314.6 -11.5 318.6 -11.5H327.0V0.7ZM288.5 -43.9V-54.4H327.0V-43.9Z M363.2 1.9Q356.0 1.9 350.5 -0.4Q345.0 -2.7 341.15 -6.6Q337.3 -10.5 335.35 -15.5Q333.4 -20.5 333.4 -26.0V-28.1Q333.4 -33.7 335.45 -38.8Q337.5 -43.9 341.35 -47.85Q345.2 -51.8 350.75 -54.05Q356.3 -56.3 363.2 -56.3Q370.1 -56.3 375.6 -54.05Q381.1 -51.8 384.95 -47.85Q388.8 -43.9 390.85 -38.8Q392.9 -33.7 392.9 -28.1V-26.0Q392.9 -20.5 390.95 -15.5Q389.0 -10.5 385.2 -6.6Q381.4 -2.7 375.85 -0.4Q370.3 1.9 363.2 1.9ZM363.2 -10.3Q368.2 -10.3 371.6 -12.5Q375.0 -14.7 376.8 -18.5Q378.6 -22.3 378.6 -27.1Q378.6 -32.0 376.75 -35.8Q374.9 -39.6 371.45 -41.85Q368.0 -44.1 363.2 -44.1Q358.4 -44.1 354.9 -41.85Q351.4 -39.6 349.55 -35.8Q347.7 -32.0 347.7 -27.1Q347.7 -22.3 349.5 -18.5Q351.3 -14.7 354.75 -12.5Q358.2 -10.3 363.2 -10.3Z" transform="translate(143.5,0)" fill="#1E232B"/>
              </svg>
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