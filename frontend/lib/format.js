export function naira(n) {
  if (n == null) return '—';
  return '₦' + Number(n).toLocaleString('en-NG');
}
export function shortDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}
