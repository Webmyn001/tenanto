import Layout from '../../components/Layout';

const RULES = [
  {
    title: 'Accurate Listings',
    body: 'All property details (rent, location, features, media) must be accurate and up to date. Misleading listings will be removed and may lead to account suspension.',
  },
  {
    title: 'Responsiveness',
    body: 'Respond to tenant inquiries and inspection requests within 24 hours. Repeated failure to respond may result in listing deactivation.',
  },
  {
    title: 'Inspection Conduct',
    body: 'Honour all booked inspections. If you cannot make it, cancel at least 2 hours in advance. No-show landlords may be charged a penalty fee.',
  },
  {
    title: 'Escrow & Payments',
    body: 'All rent and fees go through the Tenanto escrow system. Never accept payments outside the platform. Violation may result in permanent account ban.',
  },
  {
    title: 'Platform Fees',
    body: 'A service fee is deducted from each successfully completed tenancy. You will see the exact fee before confirming any agreement.',
  },
  {
    title: 'Dispute Resolution',
    body: 'Tenanto mediates disputes related to property damage, deposit refunds, and contract breaches. Both parties must participate in good faith. The platform\'s decision is final.',
  },
  {
    title: 'Tenant Privacy',
    body: 'Do not share tenant personal information with third parties. Contact tenants only through the Tenanto messaging system before move-in.',
  },
  {
    title: 'Prohibited Conduct',
    body: 'No fraudulent listings, discriminatory practices, harassment, or attempts to bypass the platform. Any of these will result in immediate account suspension and forfeiture of escrow protection.',
  },
  {
    title: 'Listing Standards',
    body: 'All listings must include at least 1 image and accurate location data. Listings with insufficient detail may be rejected during admin review.',
  },
  {
    title: 'Policy Changes',
    body: 'Tenanto may update these rules at any time. Landlords will be notified of material changes and must re-accept them to continue listing.',
  },
];

export default function LandlordRulesPage() {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold font-display">Landlord Platform Rules & Regulations</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: April 2026</p>
        <p className="mt-4 text-sm text-gray-600">
          These rules govern all landlords listing properties on Tenanto. By listing a property, you agree to comply with these terms.
          Violations may result in listing removal, account suspension, or permanent ban.
        </p>

        <div className="mt-8 space-y-6">
          {RULES.map((r, i) => (
            <div key={i} className="card">
              <h2 className="font-semibold text-brand-800">{i + 1}. {r.title}</h2>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <p className="font-medium">By listing on Tenanto, you acknowledge that:</p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>You have read and understood all the rules above</li>
            <li>You agree to conduct all transactions through the Tenanto escrow system</li>
            <li>You accept that non-compliance may result in account suspension and loss of escrow protection</li>
            <li>You are the legitimate owner or authorized agent of the listed property</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}