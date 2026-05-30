import Link from 'next/link';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout wide>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl gradient-warm px-6 py-12 sm:px-12 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <span className="badge mb-4">Verified · Escrow-protected · No agents</span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-ink-900 sm:text-5xl lg:text-6xl">
              Find a place to live.{' '}
              <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
                Skip the agent runaround.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-ink-700 sm:text-lg">
              Built for Nigerian students, corpers, and anyone tired of paying agents for a tour
              of the wrong building. Verified landlords, QR-coded inspections, escrow until you
              move in. If anything's off, you get a refund.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/listings" className="btn-primary">Browse listings →</Link>
              <Link href="/register" className="btn-outline">Sign up</Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-ink-500">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500"/> NIN + School verified
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent-500"/> 1% rent cashback
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-500"/> Pay in installments
              </span>
            </div>
          </div>

          {/* Hero card stack */}
          <div className="lg:col-span-2">
            <div className="relative flex flex-col gap-4 sm:block">
              <div className="card-elevated -rotate-1 bg-white sm:rotate-[-2deg]">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-lg">🏠</span>
                  <div>
                    <p className="font-semibold">Cozy self-contain · Agbowo</p>
                    <p className="text-xs text-ink-500">University of Ibadan · 0.6 km</p>
                  </div>
                </div>
                <hr className="my-3 border-ink-100"/>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-extrabold text-brand-700">₦450,000<span className="text-sm font-normal text-ink-500">/yr</span></p>
                  <span className="badge shrink-0">✓ Verified</span>
                </div>
              </div>
              <div className="card-elevated rotate-1 bg-white sm:absolute sm:-right-6 sm:-bottom-4 sm:rotate-[3deg]">
                <p className="text-xs uppercase tracking-wider text-ink-500">Inspection scheduled</p>
                <p className="mt-1 font-semibold">Sat, 10:00 AM</p>
                <p className="mt-2 text-xs text-ink-500">QR code unlocks address</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="mt-16">
        <h2 className="font-display text-center text-3xl font-extrabold sm:text-4xl">Built for everyone in the housing chain</h2>
        <p className="mt-2 text-center text-ink-500">Different needs, one platform — no agents in between.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { icon: '🎓', title: 'Students', subtitle: 'Verify with .edu.ng', body: 'See only listings near your school. Match with verified roommates by department and budget.', tone: 'role-student', accent: 'from-blue-50 to-white' },
            { icon: '🪖', title: 'NYSC Corpers', subtitle: 'Verify with NIN + state code', body: 'Listings filtered by your state of service. Secure rent in escrow before you arrive in a new state.', tone: 'role-corper', accent: 'from-green-50 to-white' },
            { icon: '🔑', title: 'Landlords', subtitle: 'Verify with NIN + property docs', body: 'Get pre-verified inquiries only. Skip the agent commission. Escrow guarantees you get paid.', tone: 'role-landlord', accent: 'from-violet-50 to-white' },
          ].map((c) => (
            <div key={c.title} className={`card relative overflow-hidden bg-gradient-to-br ${c.accent}`}>
              <div className="text-3xl">{c.icon}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{c.title}</h3>
              <span className={`${c.tone} mt-1`}>{c.subtitle}</span>
              <p className="mt-3 text-sm text-ink-700">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-16 grid items-start gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">How Tenanto works</h2>
          <p className="mt-2 text-ink-500">Four steps. Each one designed to keep you protected and on-platform.</p>
        </div>
        <ol className="space-y-3">
          {[
            ['Verify once', 'Students upload school ID + .edu.ng email. Corpers verify NIN + state code. Landlords submit ID, utility bill, and property docs. One-time setup.'],
            ['Book a real inspection', 'Pay a small refundable fee (₦2k–₦5k). Address reveals for 48 hours. Landlord scans your QR code at the meeting — no awkward phone numbers needed.'],
            ['Pay into escrow', 'Full, installment, or split with roommates. Funds locked until you confirm move-in. Earn 1% cashback on successful tenancies.'],
            ['Move in or get a refund', 'Confirm move-in within 7 days and we release funds to the landlord. Listing inaccurate? Open a dispute. We refund — that\'s the whole point.'],
          ].map(([t, b], i) => (
            <li key={i} className="card flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 font-bold text-white">{i+1}</span>
              <div>
                <p className="font-display font-bold">{t}</p>
                <p className="mt-1 text-sm text-ink-700">{b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* TRUST */}
      <section className="mt-16 grid gap-5 md:grid-cols-4">
        {[
          ['🪪', 'Identity verified', 'NIN, school email, ID + selfie liveness'],
          ['🔒', 'Escrow protected', 'Rent locked until you confirm move-in'],
          ['🚫', 'Anti-bypass chat', 'Phone numbers and links auto-blocked'],
          ['💸', '1% cashback', 'Earn wallet credit on every tenancy'],
        ].map(([icon, title, body]) => (
          <div key={title} className="card-elevated">
            <div className="text-2xl">{icon}</div>
            <p className="mt-2 font-semibold">{title}</p>
            <p className="text-xs text-ink-500">{body}</p>
          </div>
        ))}
      </section>

      {/* WARNING BANNER */}
      <section className="card mt-16 border-accent-200 bg-accent-50">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-display font-bold text-accent-900">Don't pay outside the platform</h3>
            <p className="mt-1 text-sm text-accent-800">
              Off-platform payments aren't escrow-protected. No refunds, no dispute resolution.
              If a landlord asks you to pay direct, report them — your account stays in good standing.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 overflow-hidden rounded-3xl gradient-brand px-6 py-12 text-center text-white sm:px-12 sm:py-16">
        <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Ready to find your next place?</h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-100">Sign up in 2 minutes. Verification takes another 5. Then you're browsing real listings from real landlords.</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="btn-accent">Create your account</Link>
          <Link href="/listings" className="btn bg-white/10 text-white hover:bg-white/20">Browse first</Link>
        </div>
      </section>
    </Layout>
  );
}
