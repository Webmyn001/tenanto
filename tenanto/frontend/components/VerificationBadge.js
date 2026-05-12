export default function VerificationBadge({ user }) {
  if (!user) return null;
  if (user.verificationStatus === 'approved') {
    return <span className="badge">✓ Verified {user.role}</span>;
  }
  if (user.verificationStatus === 'submitted') {
    return <span className="badge-warn">Verification pending review</span>;
  }
  if (user.verificationStatus === 'rejected') {
    return <span className="badge-warn">Verification rejected</span>;
  }
  return <span className="badge-gray">Not verified</span>;
}
