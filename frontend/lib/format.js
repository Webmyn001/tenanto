export function naira(n) {
  if (n == null) return '—';
  return '₦' + Number(n).toLocaleString('en-NG');
}

export function formatPriceInput(value) {
  const raw = value.replace(/[^0-9]/g, '');
  if (!raw) return '';
  return Number(raw).toLocaleString('en-NG');
}

export function shortDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}
