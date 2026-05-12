export default function VerificationBadge({ user }) {
  if (!user) return null;
  if (user.verificationStatus === 'approved') {
    const roleClass = `role-${user.role}`;
    return <span className={roleClass}>✓ Verified {user.role}</span>;
  }
  if (user.verificationStatus === 'submitted') {
    return <span className="badge-warn">⏳ Pending review</span>;
  }
  if (user.verificationStatus === 'rejected') {
    return <span className="badge-danger">✗ Rejected</span>;
  }
  return <span className="badge-gray">Not verified</span>;
}
