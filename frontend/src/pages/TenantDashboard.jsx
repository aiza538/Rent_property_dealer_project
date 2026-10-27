import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatPKR } from '../constants';

export default function TenantDashboard() {
  const [tenancy, setTenancy] = useState(null);
  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  async function load() {
    try {
      const [t, p, c] = await Promise.all([
        api('/tenants/my-tenancy'),
        api('/tenants/rent-payments'),
        api('/tenants/complaints'),
      ]);
      setTenancy(t);
      setPayments(p);
      setComplaints(c);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function submitComplaint(e) {
    e.preventDefault();
    if (!tenancy) return;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api('/tenants/complaints', {
        method: 'POST',
        body: { property_id: tenancy.property_id, title: form.title, description: form.description },
      });
      setForm({ title: '', description: '' });
      setNotice('Complaint submitted successfully.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Tenant Dashboard</h1>
      {error && <p className="error">{error}</p>}
      {tenancy ? (
        <div className="card">
          <h3>{tenancy.property_title}</h3>
          <p>Monthly rent: {formatPKR(tenancy.monthly_rent)} · Due day: {tenancy.due_day} · Status: <StatusBadge status={tenancy.status} /></p>
        </div>
      ) : (
        <p className="muted">No active tenancy yet.</p>
      )}

      <h2>Rent payments</h2>
      <table className="table">
        <thead><tr><th>Amount</th><th>Due date</th><th>Paid date</th><th>Status</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{formatPKR(p.amount)}</td><td>{p.due_date}</td><td>{p.paid_date || '—'}</td>
              <td><StatusBadge status={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Report a complaint</h2>
      {notice && <p className="success">{notice}</p>}
      {!tenancy && (
        <p className="muted">You can submit a complaint once a landlord links you to a property (active tenancy).</p>
      )}
      <form onSubmit={submitComplaint} className="form card">
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button className="btn btn-primary" type="submit" disabled={!tenancy || submitting}>
          {submitting ? 'Submitting...' : 'Submit complaint'}
        </button>
      </form>
      <table className="table">
        <thead><tr><th>Title</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>
          {complaints.map((c) => (
            <tr key={c.id}>
              <td>{c.title}</td><td><StatusBadge status={c.status} /></td>
              <td>{new Date(c.updated_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
