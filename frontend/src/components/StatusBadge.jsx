// ONE color mapping used everywhere for statuses. Do not invent new
// colors per page — add a status here if a new one appears.
const COLORS = {
  // inquiries
  new: 'blue',
  viewing_scheduled: 'amber',
  closed: 'green',
  lost: 'red',
  // links
  pending: 'amber',
  active: 'green',
  revoked: 'gray',
  // commissions
  paid: 'green',
  // complaints
  open: 'blue',
  in_progress: 'amber',
  resolved: 'green',
  // tenancies / payments
  ended: 'gray',
  overdue: 'red',
};

const LABELS = {
  new: 'New',
  viewing_scheduled: 'Viewing scheduled',
  closed: 'Closed',
  lost: 'Lost',
  pending: 'Pending',
  active: 'Active',
  revoked: 'Revoked',
  paid: 'Paid',
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  ended: 'Ended',
  overdue: 'Overdue',
};

export default function StatusBadge({ status }) {
  const color = COLORS[status] || 'gray';
  return <span className={`badge badge-${color}`}>{LABELS[status] || status}</span>;
}
