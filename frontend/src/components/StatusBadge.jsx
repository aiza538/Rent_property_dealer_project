// ONE color mapping used everywhere for statuses. Do not invent new
// colors per page — add a status here if a new one appears.
import { useLanguage } from '../i18n';

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

const LABEL_KEYS = {
  new: 'stNew',
  viewing_scheduled: 'stViewing',
  closed: 'stClosed',
  lost: 'stLost',
  pending: 'stPending',
  active: 'stActive',
  revoked: 'stRevoked',
  paid: 'stPaid',
  open: 'stOpen',
  in_progress: 'stInProgress',
  resolved: 'stResolved',
  ended: 'stEnded',
  overdue: 'stOverdue',
};

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const color = COLORS[status] || 'gray';
  const key = LABEL_KEYS[status];
  return <span className={`badge badge-${color}`}>{key ? t(key) : status}</span>;
}
