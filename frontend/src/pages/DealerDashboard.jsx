import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatPKR } from '../constants';

export default function DealerDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dealers/dashboard/summary').then(setSummary).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Dealer Dashboard</h1>
      <div className="grid">
        <div className="card"><h3>Linked landlords</h3><p className="big">{summary.total_linked_landlords}</p></div>
        <div className="card"><h3>Properties</h3><p className="big">{summary.total_properties}</p></div>
        <div className="card"><h3>Vacant units</h3><p className="big">{summary.vacant_count}</p></div>
        <div className="card"><h3>Open inquiries</h3><p className="big">{summary.open_inquiries_count}</p></div>
        <div className="card"><h3>Pending commission</h3><p className="big">{formatPKR(summary.pending_commission_total)}</p></div>
      </div>

      <h2>Recent activity</h2>
      <div className="grid">
        <div className="card">
          <h3>Recent inquiries</h3>
          {summary.recent_inquiries.length === 0 && <p className="muted">None yet.</p>}
          <ul className="list">
            {summary.recent_inquiries.map((i) => (
              <li key={i.id}>
                {i.prospective_tenant_name} — {i.property_title} <StatusBadge status={i.status} />
              </li>
            ))}
          </ul>
          <Link to="/dealer/inquiries">View all inquiries →</Link>
        </div>
        <div className="card">
          <h3>Recent listings</h3>
          {summary.recent_listings.length === 0 && <p className="muted">None yet.</p>}
          <ul className="list">
            {summary.recent_listings.map((l) => (
              <li key={l.id}>
                {l.property_title} — {l.is_vacant ? 'Vacant' : 'Occupied'}
              </li>
            ))}
          </ul>
          <Link to="/dealer/properties">View properties →</Link>
        </div>
      </div>
    </div>
  );
}
