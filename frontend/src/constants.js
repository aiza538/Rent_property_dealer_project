// Currency is defined exactly once and used everywhere money is shown.
export const CURRENCY = 'PKR';

export function formatPKR(amount) {
  const n = Number(amount || 0);
  return `${CURRENCY} ${n.toLocaleString('en-PK')}`;
}
