import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatAFN } from '../constants';
import { useLanguage } from '../i18n';

export default function DealerDashboard() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dealers/dashboard/summary').then(setSummary).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p className="muted">{t('loading')}</p>;

  return (
    <div>
      <h1>{t('dealerDashboard')}</h1>
      <div className="grid">
        <div className="card"><h3>{t('linkedLandlords')}</h3><p className="big">{summary.total_linked_landlords}</p></div>
        <div className="card"><h3>{t('properties')}</h3><p className="big">{summary.total_properties}</p></div>
        <div className="card"><h3>{t('vacantUnits')}</h3><p className="big">{summary.vacant_count}</p></div>
        <div className="card"><h3>{t('openInquiries')}</h3><p className="big">{summary.open_inquiries_count}</p></div>
        <div className="card"><h3>{t('pendingCommission')}</h3><p className="big">{formatAFN(summary.pending_commission_total)}</p></div>
      </div>

      <h2>{t('recentActivity')}</h2>
      <div className="grid">
        <div className="card">
          <h3>{t('recentInquiries')}</h3>
          {summary.recent_inquiries.length === 0 && <p className="muted">{t('noneYet')}</p>}
          <ul className="list">
            {summary.recent_inquiries.map((i) => (
              <li key={i.id}>
                {i.prospective_tenant_name} — {i.property_title} <StatusBadge status={i.status} />
              </li>
            ))}
          </ul>
          <Link to="/dealer/inquiries">{t('viewAllInquiries')}</Link>
        </div>
        <div className="card">
          <h3>{t('recentListings')}</h3>
          {summary.recent_listings.length === 0 && <p className="muted">{t('noneYet')}</p>}
          <ul className="list">
            {summary.recent_listings.map((l) => (
              <li key={l.id}>
                {l.property_title} — {l.is_vacant ? t('vacant') : t('occupied')}
              </li>
            ))}
          </ul>
          <Link to="/dealer/properties">{t('viewProperties')}</Link>
        </div>
      </div>
    </div>
  );
}
