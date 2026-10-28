import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../AuthContext';
import { formatPKR } from '../constants';
import { useLanguage } from '../i18n';

export default function Commissions() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ property_id: '', amount: '', deal_closed_date: '', notes: '' });

  async function load() {
    try {
      if (user.role === 'dealer') {
        const [c, p] = await Promise.all([api('/dealers/commissions'), api('/dealers/properties')]);
        setRows(c);
        setProperties(p);
      } else {
        setRows(await api('/landlords/commissions'));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  // Dealer side: "request payment" = record a closed deal as a pending commission.
  async function requestPayment(e) {
    e.preventDefault();
    await api('/dealers/commissions', {
      method: 'POST',
      body: {
        property_id: Number(form.property_id),
        amount: Number(form.amount),
        deal_closed_date: form.deal_closed_date || null,
        notes: form.notes,
      },
    });
    setForm({ property_id: '', amount: '', deal_closed_date: '', notes: '' });
    load();
  }

  return (
    <div>
      <h1>{t('commissions')}</h1>
      {error && <p className="error">{error}</p>}
      {user.role === 'dealer' && (
        <form onSubmit={requestPayment} className="form card">
          <h3>{t('requestPaymentTitle')}</h3>
          <div className="row">
            <label>{t('property')}
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} required>
                <option value="">{t('select')}</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            <label>{t('amount')}<input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label>{t('dealClosedDate')}<input type="date" value={form.deal_closed_date} onChange={(e) => setForm({ ...form, deal_closed_date: e.target.value })} /></label>
          </div>
          <label>{t('notes')}<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <button className="btn btn-primary" type="submit">{t('requestPayment')}</button>
        </form>
      )}
      <table className="table">
        <thead><tr><th>{t('property')}</th><th>{t('amount')}</th><th>{t('status')}</th><th>{t('closedCol')}</th><th>{t('action')}</th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.property_title}</td><td>{formatPKR(c.amount)}</td>
              <td><StatusBadge status={c.status} /></td>
              <td>{c.deal_closed_date || '—'}</td>
              <td>
                {user.role === 'landlord' && c.status === 'pending' && (
                  <button
                    className="btn btn-small"
                    onClick={async () => {
                      await api(`/landlords/commissions/${c.id}/mark-paid`, { method: 'POST' });
                      load();
                    }}
                  >
                    {t('markAsPaid')}
                  </button>
                )}
                {user.role === 'dealer' && c.status === 'pending' && <span className="muted">{t('awaitingLandlord')}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
