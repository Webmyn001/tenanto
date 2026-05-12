import { naira } from '../lib/format';

export default function AddressGate({ property, onBook }) {
  return (
    <div className="card border-amber-200 bg-amber-50">
      <h3 className="font-semibold text-amber-900">Full address is protected</h3>
      <p className="mt-1 text-sm text-amber-800">
        We only show the area ({property.area}) until you book a verified inspection.
        This protects landlords from off-platform poaching and protects you from fraud.
      </p>
      <ul className="mt-3 list-inside list-disc text-sm text-amber-800">
        <li>Refundable inspection fee: <b>{naira(property.inspectionFee)}</b> (credited towards rent)</li>
        <li>Address visible for 48 hours after booking</li>
        <li>Landlord scans your QR code at the meeting — no awkward phone numbers needed</li>
      </ul>
      <button onClick={onBook} className="btn-primary mt-4">Book inspection</button>
    </div>
  );
}
