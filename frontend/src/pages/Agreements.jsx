import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLanguage } from '../i18n';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const EMPTY = { property_id: '', title: '', content: '' };

async function downloadPdf(id, title) {
  const token = localStorage.getItem('rent_aasan_token');
  const res = await fetch(`${BASE}/dealers/agreements/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Could not download PDF (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rental-agreement-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Agreements() {
  const { t } = useLanguage();
  const [agreements, setAgreements] = useState([]);
  const [properties, setProperties] = useState([]);
  const [profile, setProfile] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [a, p, prof] = await Promise.all([
        api('/dealers/agreements'),
        api('/dealers/properties'),
        api('/dealers/profile'),
      ]);
      setAgreements(a);
      setProperties(p);
      setProfile(prof);
      if (prof) setBusinessName(prof.business_name || '');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const saved = profile
        ? await api('/dealers/profile', { method: 'PUT', body: { business_name: businessName } })
        : await api('/dealers/profile', { method: 'POST', body: { business_name: businessName } });
      setProfile(saved);
      setNotice(t('titleSaved'));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api('/dealers/agreements', {
        method: 'POST',
        body: {
          title: form.title,
          content: form.content,
          property_id: form.property_id ? Number(form.property_id) : null,
        },
      });
      setForm(EMPTY);
      setNotice(t('agreementSaved'));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id) {
    setError('');
    setNotice('');
    try {
      await api(`/dealers/agreements/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDownload(id) {
    setError('');
    try {
      await downloadPdf(id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>{t('agreementsTitle')}</h1>
      <p className="muted">{t('agreementsHint')}</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}
      <form onSubmit={saveProfile} className="form card">
        <h3>{t('dealerTitleOnPdf')}</h3>
        <p className="muted">{t('dealerTitleHint')}</p>
        <label>{t('businessName')}<input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder={t('businessNamePh')} /></label>
        <button className="btn btn-primary" type="submit">{t('saveTitle')}</button>
      </form>
      <form onSubmit={submit} className="form card">
        <label>{t('agreementTitle')}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder={t('agreementTitlePh')} /></label>
        <label>{t('propertyOptional')}
          <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
            <option value="">{t('noProperty')}</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label>{t('agreementContent')}<textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required rows={12} placeholder={t('agreementContentPh')} /></label>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? t('saving') : t('saveAgreement')}
        </button>
      </form>
      <h2>{t('savedAgreements')}</h2>
      {agreements.length === 0 && <p className="muted">{t('noAgreements')}</p>}
      <table className="table">
        <thead><tr><th>{t('title')}</th><th>{t('property')}</th><th>{t('created')}</th><th></th></tr></thead>
        <tbody>
          {agreements.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.property_title || '—'}</td>
              <td>{new Date(a.created_at).toLocaleDateString()}</td>
              <td>
                <button className="btn btn-small" onClick={() => onDownload(a.id)}>{t('downloadPdf')}</button>{' '}
                <button className="btn btn-small btn-danger" onClick={() => onDelete(a.id)}>{t('delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
