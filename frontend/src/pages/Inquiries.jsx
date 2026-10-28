import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../i18n';

const EMPTY = { property_id: '', prospective_tenant_name: '', contact_number: '', notes: '', status: 'new', viewing_date: '' };

export default function Inquiries() {
  const { t } = useLanguage();
  const [inquiries, setInquiries] = useState([]);
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [i, p] = await Promise.all([api('/dealers/inquiries'), api('/dealers/properties')]);
      setInquiries(i);
      setProperties(p);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  // Fast form: only name, contact, property and notes are required.
  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api('/dealers/inquiries', {
        method: 'POST',
        body: {
          property_id: Number(form.property_id),
          prospective_tenant_name: form.prospective_tenant_name,
          contact_number: form.contact_number,
          notes: form.notes,
          status: form.status,
          viewing_date: form.viewing_date ? new Date(form.viewing_date).toISOString() : null,
        },
      });
      setForm(EMPTY);
      setNotice(t('inquirySuccess'));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>{t('inquiries')}</h1>
      <p className="muted">{t('inquiriesHint')}</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}
      {properties.length === 0 && (
        <p className="muted">{t('noPropertiesHint')}</p>
      )}
      <form onSubmit={submit} className="form card">
        <div className="row">
          <label>{t('name')}<input value={form.prospective_tenant_name} onChange={(e) => setForm({ ...form, prospective_tenant_name: e.target.value })} required /></label>
          <label>{t('contactNumber')}<input value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} required /></label>
        </div>
        <div className="row">
          <label>{t('property')}
            <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} required>
              <option value="">{t('select')}</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label>{t('statusOptional')}
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="new">{t('stNew')}</option>
              <option value="viewing_scheduled">{t('stViewing')}</option>
              <option value="closed">{t('stClosed')}</option>
              <option value="lost">{t('stLost')}</option>
            </select>
          </label>
          <label>{t('viewingDateOptional')}<input type="datetime-local" value={form.viewing_date} onChange={(e) => setForm({ ...form, viewing_date: e.target.value })} /></label>
        </div>
        <label>{t('notes')}<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} required /></label>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? t('logging') : t('logInquiry')}
        </button>
      </form>
      <table className="table">
        <thead><tr><th>{t('name')}</th><th>{t('contact')}</th><th>{t('property')}</th><th>{t('status')}</th><th>{t('viewing')}</th><th>{t('notes')}</th></tr></thead>
        <tbody>
          {inquiries.map((i) => (
            <tr key={i.id}>
              <td>{i.prospective_tenant_name}</td><td>{i.contact_number}</td><td>{i.property_title}</td>
              <td>
                <select
                  value={i.status}
                  onChange={async (e) => {
                    await api(`/dealers/inquiries/${i.id}`, { method: 'PUT', body: { status: e.target.value } });
                    load();
                  }}
                >
                  <option value="new">{t('stNew')}</option>
                  <option value="viewing_scheduled">{t('stViewing')}</option>
                  <option value="closed">{t('stClosed')}</option>
                  <option value="lost">{t('stLost')}</option>
                </select>
              </td>
              <td>{i.viewing_date ? new Date(i.viewing_date).toLocaleString() : '—'}</td>
              <td>{i.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
