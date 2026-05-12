import Navbar from './Navbar';

export default function Layout({ children, wide = false }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className={`mx-auto px-4 py-8 ${wide ? 'max-w-7xl' : 'max-w-6xl'}`}>{children}</main>
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Tenanto — verified, escrow-protected, agent-free.
      </footer>
    </div>
  );
}
