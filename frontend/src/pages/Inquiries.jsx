import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

const EMPTY = { property_id: '', prospective_tenant_name: '', contact_number: '', notes: '', status: 'new', viewing_date: '' };

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

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
    load();
  }

  return (
    <div>
      <h1>Inquiries</h1>
      <p className="muted">Log an inquiry right after a call — only name, contact, property and notes are required.</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={submit} className="form card">
        <div className="row">
          <label>Name<input value={form.prospective_tenant_name} onChange={(e) => setForm({ ...form, prospective_tenant_name: e.target.value })} required /></label>
          <label>Contact number<input value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} required /></label>
        </div>
        <div className="row">
          <label>Property
            <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} required>
              <option value="">Select…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label>Status (optional)
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="new">New</option>
              <option value="viewing_scheduled">Viewing scheduled</option>
              <option value="closed">Closed</option>
              <option value="lost">Lost</option>
            </select>
          </label>
          <label>Viewing date (optional)<input type="datetime-local" value={form.viewing_date} onChange={(e) => setForm({ ...form, viewing_date: e.target.value })} /></label>
        </div>
        <label>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} required /></label>
        <button className="btn btn-primary" type="submit">Log inquiry</button>
      </form>
      <table className="table">
        <thead><tr><th>Name</th><th>Contact</th><th>Property</th><th>Status</th><th>Viewing</th><th>Notes</th></tr></thead>
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
                  <option value="new">New</option>
                  <option value="viewing_scheduled">Viewing scheduled</option>
                  <option value="closed">Closed</option>
                  <option value="lost">Lost</option>
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
