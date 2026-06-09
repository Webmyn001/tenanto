import Layout from '../../components/Layout';

export default function PaymentConditions() {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Payment Conditions</h1>
        <p className="text-gray-500 mb-8">How payments, escrow, and fees work on Tenanto.</p>

        <section>
          <h2 className="text-xl font-semibold mb-4">How Escrow Works</h2>
          <div className="space-y-4">
            <Step number={1} title="You pay into escrow" icon="💳">
              When you pay rent through Tenanto, your money is held securely by Paystack (a licensed payment gateway) in an escrow account. The landlord <b>cannot</b> access it yet.
            </Step>
            <Step number={2} title="Confirm move-in" icon="🗝️">
              After you inspect and move into the property, you click <b>"Confirm move-in"</b> in your dashboard. This signals to Tenanto that everything is satisfactory.
            </Step>
            <Step number={3} title="Funds released to landlord" icon="✅">
              Once you confirm move-in (or after 7 days if you don't), the net rent is transferred directly to the landlord's bank account via Paystack Transfers.
            </Step>
            <Step number={4} title="Disputes" icon="⚖️">
              If there's a problem (property isn't as described, landlord disappears, etc.), you can <b>open a dispute</b> to freeze the escrow. An admin reviews the case and either releases the funds to the landlord or refunds you.
            </Step>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Fee Breakdown</h2>
          <div className="overflow-hidden rounded-xl border border-ink-200">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Fee</th>
                  <th className="text-left px-5 py-3 font-semibold">Paid By</th>
                  <th className="text-left px-5 py-3 font-semibold">Amount</th>
                  <th className="text-left px-5 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                <tr className="hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-medium">Platform fee</td>
                  <td className="px-5 py-3">Landlord (deducted from payout)</td>
                  <td className="px-5 py-3">10% of annual rent</td>
                  <td className="px-5 py-3">On escrow release</td>
                </tr>
                <tr className="hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-medium">Service fee</td>
                  <td className="px-5 py-3">Tenant (added to total)</td>
                  <td className="px-5 py-3">5% of annual rent</td>
                  <td className="px-5 py-3">At payment</td>
                </tr>
                <tr className="hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-medium">Cashback</td>
                  <td className="px-5 py-3 text-green-700">Earned by tenant</td>
                  <td className="px-5 py-3">1% of rent → in-app wallet</td>
                  <td className="px-5 py-3">On move-in confirmation</td>
                </tr>
                <tr className="hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-medium">Service charge</td>
                  <td className="px-5 py-3">Tenant</td>
                  <td className="px-5 py-3">Set by landlord (pass-through)</td>
                  <td className="px-5 py-3">At payment</td>
                </tr>
                <tr className="hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-medium">Caution fee</td>
                  <td className="px-5 py-3">Tenant</td>
                  <td className="px-5 py-3">Set by landlord (pass-through)</td>
                  <td className="px-5 py-3">At payment</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Payment Modes</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <ModeCard
              title="Pay in Full"
              desc="Pay the entire annual rent upfront. The simplest option — one transaction, done."
              icon="🏆"
            />
            <ModeCard
              title="Installments"
              desc="Split the total into monthly payments (2–12 months). Each installment is charged separately via Paystack."
              icon="📆"
            />
            <ModeCard
              title="Group Split"
              desc="Split the rent with roommates. Each person pays their share independently. All shares must add up to the total."
              icon="👥"
            />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Important Notes</h2>
          <ul className="space-y-3 text-sm text-ink-600">
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Your money is <b>never held by Tenanto</b>. Paystack manages all funds in a PCI-compliant escrow account.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>The landlord receives the net rent <b>only after</b> you confirm move-in. This protects you from paying for an uninhabitable property.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>If you don't confirm move-in within <b>7 days</b> of moving in, the escrow is automatically released to the landlord.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span><b>Paying outside Tenanto</b> voids all escrow protection. You lose the ability to dispute, and the landlord isn't verified. Always pay on-platform.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
              <span>Your <b>in-app wallet</b> balance can be applied at checkout to reduce what you pay upfront. Wallet credits come from cashback earned on previous tenancies.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">6</span>
              <span>If you paid an <b>inspection fee</b>, it's credited toward your rent when you initiate payment.</span>
            </li>
          </ul>
        </section>
      </div>
    </Layout>
  );
}

function Step({ number, title, icon, children }) {
  return (
    <div className="flex gap-4 rounded-xl border border-ink-200 bg-white p-5">
      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 text-lg flex items-center justify-center shrink-0">
        {icon || number}
      </div>
      <div>
        <h3 className="font-semibold mb-1">{number}. {title}</h3>
        <p className="text-sm text-ink-600">{children}</p>
      </div>
    </div>
  );
}

function ModeCard({ title, desc, icon }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-ink-600">{desc}</p>
    </div>
  );
}
