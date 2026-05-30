import Navbar from './Navbar';

export default function Layout({ children, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 ${wide ? 'max-w-7xl' : 'max-w-6xl'}`}>
        {children}
      </main>
      <footer className="mt-12 border-t border-ink-200 bg-cream-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-ink-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Tenanto — verified, escrow-protected, agent-free.</p>
          <div className="flex gap-4">
            <a href="/legal/TERMS.md" className="hover:text-brand-700">Terms</a>
            <a href="/legal/landlord-rules" className="hover:text-brand-700">Landlord rules</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
