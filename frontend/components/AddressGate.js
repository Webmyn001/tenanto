import { naira } from '../lib/format';

export default function AddressGate({ property, onBook }) {
  return (
    <div className="card border-accent-200 bg-accent-50">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔒</span>
        <div>
          <h3 className="font-display font-bold text-accent-900">Full address is protected</h3>
          <p className="mt-1 text-sm text-accent-800">
            We only show the area ({property.area}) until you book a verified inspection.
            This protects landlords from off-platform poaching and protects you from fraud.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-accent-800">
            <li>Refundable inspection fee: <b>{naira(property.inspectionFee)}</b> (credited towards rent)</li>
            <li>Address visible for 48 hours after booking</li>
            <li>Landlord scans your QR code at the meeting — no awkward phone numbers</li>
          </ul>
          <button onClick={onBook} className="btn-accent mt-4">Book inspection</button>
        </div>
      </div>
    </div>
  );
}
