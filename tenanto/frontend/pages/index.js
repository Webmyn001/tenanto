import Link from 'next/link';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
        <div>
          <span className="badge mb-4">Verified · Escrow-protected · No agents</span>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Find student & corper housing — <span className="text-brand-700">without the agent runaround.</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Direct verified landlords. QR-coded inspections. Funds held in escrow until you move in.
            If anything's off, you get a refund — guaranteed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/listings" className="btn-primary">Browse listings</Link>
            <Link href="/register" className="btn-outline">Sign up</Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
            <div className="card">🪪 NIN + School verified</div>
            <div className="card">🔒 Escrow protected</div>
            <div className="card">💸 Pay in installments</div>
          </div>
        </div>
        <div className="card relative overflow-hidden bg-gradient-to-br from-brand-50 to-white">
          <h2 className="font-semibold">How it works</h2>
          <ol className="mt-4 space-y-4">
            {[
              ['1', 'Verify your identity', 'Students upload school ID + .edu.ng email. Corpers verify NIN + state code. One-time setup.'],
              ['2', 'Book a real inspection', 'Pay a small refundable fee (₦2k–₦5k). Address reveals for 48 h. Landlord scans your QR at the meeting.'],
              ['3', 'Pay into escrow', 'Full, installment, or split with roommates. Funds locked until you confirm move-in.'],
              ['4', 'Move in & we release funds', 'Inaccurate listing? Open a dispute. We refund — that\'s the whole point.'],
            ].map(([n, t, b]) => (
              <li key={n} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{n}</span>
                <div>
                  <p className="font-medium">{t}</p>
                  <p className="text-sm text-gray-600">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="card mt-10 border-amber-200 bg-amber-50">
        <h3 className="font-semibold text-amber-900">⚠️ Don't pay outside the platform</h3>
        <p className="mt-1 text-sm text-amber-800">
          Payments outside Tenanto are not protected. No refunds, no dispute resolution.
          If a landlord asks you to pay direct, report them — your account stays in good standing.
        </p>
      </section>
    </Layout>
  );
}
