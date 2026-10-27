import { useEffect, useState } from 'react';
import { api } from '../api';

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
      setNotice('Dealer title saved. It will appear on every agreement PDF.');
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
      setNotice('Agreement saved. Download its PDF from the list below.');
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
      <h1>Rental Agreements</h1>
      <p className="muted">
        Write the agreement in your own words. The PDF is laid out as an organized
        document under your business name (from your dealer profile, else your name).
      </p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}
      <form onSubmit={saveProfile} className="form card">
        <h3>Dealer title on PDFs</h3>
        <p className="muted">This name appears at the top of every agreement PDF as the property dealer title. If left empty, your own name is used.</p>
        <label>Business name<input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="e.g. Demo Estate Advisors" /></label>
        <button className="btn btn-primary" type="submit">Save title</button>
      </form>
      <form onSubmit={submit} className="form card">
        <label>Agreement title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Rent Agreement - Gulberg Flat" /></label>
        <label>Property (optional)
          <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
            <option value="">No specific property</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label>Agreement content<textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required rows={12} placeholder="Write whatever you want in the agreement, one clause per paragraph..." /></label>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save agreement'}
        </button>
      </form>
      <h2>Saved agreements</h2>
      {agreements.length === 0 && <p className="muted">No agreements yet.</p>}
      <table className="table">
        <thead><tr><th>Title</th><th>Property</th><th>Created</th><th></th></tr></thead>
        <tbody>
          {agreements.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.property_title || '—'}</td>
              <td>{new Date(a.created_at).toLocaleDateString()}</td>
              <td>
                <button className="btn btn-small" onClick={() => onDownload(a.id)}>Download PDF</button>{' '}
                <button className="btn btn-small btn-danger" onClick={() => onDelete(a.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
