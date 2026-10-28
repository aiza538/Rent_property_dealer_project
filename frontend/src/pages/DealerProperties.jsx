import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatPKR } from '../constants';
import { useLanguage } from '../i18n';

export default function DealerProperties() {
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [links, setLinks] = useState([]);
  const [landlordFilter, setLandlordFilter] = useState('');
  const [vacancyFilter, setVacancyFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/dealers/properties'), api('/dealers/landlords')])
      .then(([p, l]) => { setProperties(p); setLinks(l); })
      .catch((err) => setError(err.message));
  }, []);

  const landlordNames = {};
  links.forEach((l) => { landlordNames[l.landlord_id] = l.landlord_name; });

  const filtered = properties.filter((p) => {
    if (landlordFilter && String(p.landlord_id) !== landlordFilter) return false;
    if (vacancyFilter === 'vacant' && p.is_occupied) return false;
    if (vacancyFilter === 'occupied' && !p.is_occupied) return false;
    return true;
  });

  const landlordOptions = [...new Set(properties.map((p) => p.landlord_id))];

  return (
    <div>
      <h1>{t('properties')}</h1>
      <p className="muted">{t('propertiesHint')}</p>
      {error && <p className="error">{error}</p>}
      <div className="row filters">
        <label>{t('landlord')}
          <select value={landlordFilter} onChange={(e) => setLandlordFilter(e.target.value)}>
            <option value="">{t('allLandlords')}</option>
            {landlordOptions.map((id) => (
              <option key={id} value={id}>{landlordNames[id] || `Landlord ${id}`}</option>
            ))}
          </select>
        </label>
        <label>{t('status')}
          <select value={vacancyFilter} onChange={(e) => setVacancyFilter(e.target.value)}>
            <option value="all">{t('all')}</option>
            <option value="vacant">{t('vacant')}</option>
            <option value="occupied">{t('occupied')}</option>
          </select>
        </label>
      </div>
      <table className="table">
        <thead><tr><th>{t('title')}</th><th>{t('landlord')}</th><th>{t('area')}</th><th>{t('rent')}</th><th>{t('status')}</th></tr></thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td><td>{landlordNames[p.landlord_id] || '—'}</td>
              <td>{p.area}, {p.city}</td><td>{formatPKR(p.monthly_rent)}</td>
              <td>{p.is_occupied ? t('occupied') : t('vacant')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
