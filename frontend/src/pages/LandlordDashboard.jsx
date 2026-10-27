import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatPKR } from '../constants';

const TABS = ['Overview', 'Properties', 'Tenants', 'Complaints', 'Dealers', 'Commissions'];

export default function LandlordDashboard() {
  const [tab, setTab] = useState('Overview');
  const [summary, setSummary] = useState(null);
  const [properties, setProperties] = useState([]);
  const [tenancies, setTenancies] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [links, setLinks] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [error, setError] = useState('');
  const [propForm, setPropForm] = useState({
    title: '', address: '', area: '', city: 'Lahore', property_type: 'house', monthly_rent: '', is_occupied: false,
  });
  const [tenancyForm, setTenancyForm] = useState({
    property_id: '', tenant_email: '', monthly_rent: '', due_day: 5, start_date: '',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePropertyId, setInvitePropertyId] = useState('');

  async function load() {
    try {
      const [s, p, t, c, l, cm] = await Promise.all([
        api('/landlords/rent-summary'),
        api('/landlords/properties'),
        api('/landlords/tenancies'),
        api('/landlords/complaints'),
        api('/landlords/dealers'),
        api('/landlords/commissions'),
      ]);
      setSummary(s);
      setProperties(p);
      setTenancies(t);
      setComplaints(c);
      setLinks(l);
      setCommissions(cm);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function addProperty(e) {
    e.preventDefault();
    await api('/landlords/properties', {
      method: 'POST',
      body: { ...propForm, monthly_rent: Number(propForm.monthly_rent) },
    });
    setPropForm({ title: '', address: '', area: '', city: 'Lahore', property_type: 'house', monthly_rent: '', is_occupied: false });
    load();
  }

  async function addTenancy(e) {
    e.preventDefault();
    await api('/landlords/tenancies', {
      method: 'POST',
      body: {
        property_id: Number(tenancyForm.property_id),
        tenant_email: tenancyForm.tenant_email,
        monthly_rent: Number(tenancyForm.monthly_rent),
        due_day: Number(tenancyForm.due_day),
        start_date: tenancyForm.start_date,
      },
    });
    setTenancyForm({ property_id: '', tenant_email: '', monthly_rent: '', due_day: 5, start_date: '' });
    load();
  }

  async function linkAction(linkId, action) {
    await api(`/landlords/links/${linkId}/${action}`, { method: 'POST' });
    load();
  }

  async function inviteDealer(e) {
    e.preventDefault();
    await api('/landlords/links/invite-dealer', {
      method: 'POST',
      body: { email: inviteEmail, property_id: invitePropertyId ? Number(invitePropertyId) : null },
    });
    setInviteEmail('');
    setInvitePropertyId('');
    load();
  }

  return (
    <div>
      <h1>Landlord Dashboard</h1>
      {error && <p className="error">{error}</p>}
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && summary && (
        <div className="grid">
          <div className="card"><h3>Rent received</h3><p className="big">{formatPKR(summary.received)}</p></div>
          <div className="card"><h3>Rent pending</h3><p className="big">{formatPKR(summary.pending)}</p></div>
          <div className="card"><h3>Total income</h3><p className="big">{formatPKR(summary.total_income)}</p></div>
          <div className="card"><h3>Properties</h3><p className="big">{properties.length}</p></div>
          <div className="card"><h3>Active tenancies</h3><p className="big">{tenancies.filter((t) => t.status === 'active').length}</p></div>
          <div className="card"><h3>Open complaints</h3><p className="big">{complaints.filter((c) => c.status !== 'resolved').length}</p></div>
        </div>
      )}

      {tab === 'Properties' && (
        <div>
          <form onSubmit={addProperty} className="form card">
            <h3>Add property</h3>
            <div className="row">
              <label>Title<input value={propForm.title} onChange={(e) => setPropForm({ ...propForm, title: e.target.value })} required /></label>
              <label>Monthly rent<input type="number" value={propForm.monthly_rent} onChange={(e) => setPropForm({ ...propForm, monthly_rent: e.target.value })} required /></label>
            </div>
            <label>Address<input value={propForm.address} onChange={(e) => setPropForm({ ...propForm, address: e.target.value })} required /></label>
            <div className="row">
              <label>Area<input value={propForm.area} onChange={(e) => setPropForm({ ...propForm, area: e.target.value })} /></label>
              <label>City<input value={propForm.city} onChange={(e) => setPropForm({ ...propForm, city: e.target.value })} /></label>
              <label>Type
                <select value={propForm.property_type} onChange={(e) => setPropForm({ ...propForm, property_type: e.target.value })}>
                  <option value="house">House</option>
                  <option value="flat">Flat</option>
                  <option value="shop">Shop</option>
                  <option value="plot">Plot</option>
                </select>
              </label>
            </div>
            <button className="btn btn-primary" type="submit">Add property</button>
          </form>
          <table className="table">
            <thead><tr><th>Title</th><th>Area</th><th>Rent</th><th>Occupied</th></tr></thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td><td>{p.area}, {p.city}</td>
                  <td>{formatPKR(p.monthly_rent)}</td><td>{p.is_occupied ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Tenants' && (
        <div>
          <form onSubmit={addTenancy} className="form card">
            <h3>Add tenancy (tenant must already have a tenant account)</h3>
            <div className="row">
              <label>Property
                <select value={tenancyForm.property_id} onChange={(e) => setTenancyForm({ ...tenancyForm, property_id: e.target.value })} required>
                  <option value="">Select…</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
              <label>Tenant email<input value={tenancyForm.tenant_email} onChange={(e) => setTenancyForm({ ...tenancyForm, tenant_email: e.target.value })} required /></label>
            </div>
            <div className="row">
              <label>Monthly rent<input type="number" value={tenancyForm.monthly_rent} onChange={(e) => setTenancyForm({ ...tenancyForm, monthly_rent: e.target.value })} required /></label>
              <label>Due day<input type="number" min="1" max="31" value={tenancyForm.due_day} onChange={(e) => setTenancyForm({ ...tenancyForm, due_day: e.target.value })} required /></label>
              <label>Start date<input type="date" value={tenancyForm.start_date} onChange={(e) => setTenancyForm({ ...tenancyForm, start_date: e.target.value })} required /></label>
            </div>
            <button className="btn btn-primary" type="submit">Add tenancy</button>
          </form>
          <table className="table">
            <thead><tr><th>Property</th><th>Tenant</th><th>Rent</th><th>Due day</th><th>Status</th></tr></thead>
            <tbody>
              {tenancies.map((t) => (
                <tr key={t.id}>
                  <td>{t.property_title}</td><td>{t.tenant_name}</td>
                  <td>{formatPKR(t.monthly_rent)}</td><td>{t.due_day}</td>
                  <td><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Complaints' && (
        <table className="table">
          <thead><tr><th>Property</th><th>Tenant</th><th>Title</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id}>
                <td>{c.property_title}</td><td>{c.tenant_name}</td><td>{c.title}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>
                  <select
                    value={c.status}
                    onChange={async (e) => {
                      await api(`/landlords/complaints/${c.id}`, { method: 'PUT', body: { status: e.target.value } });
                      load();
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Dealers' && (
        <div>
          <form onSubmit={inviteDealer} className="form card">
            <h3>Invite a dealer</h3>
            <div className="row">
              <label>Dealer email<input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required /></label>
              <label>Property (optional — blank means all your properties)
                <select value={invitePropertyId} onChange={(e) => setInvitePropertyId(e.target.value)}>
                  <option value="">All properties</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
            </div>
            <button className="btn btn-primary" type="submit">Send invite</button>
          </form>
          <table className="table">
            <thead><tr><th>Dealer</th><th>Business</th><th>Property</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <td>{l.dealer_name}</td><td>{l.dealer_business_name || '—'}</td>
                  <td>{l.property_title || 'All properties'}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>
                    {l.status === 'pending' && l.initiated_by === 'dealer' && (
                      <>
                        <button className="btn btn-small" onClick={() => linkAction(l.id, 'approve')}>Approve</button>{' '}
                        <button className="btn btn-small btn-ghost" onClick={() => linkAction(l.id, 'reject')}>Reject</button>
                      </>
                    )}
                    {l.status === 'active' && (
                      <button className="btn btn-small btn-danger" onClick={() => linkAction(l.id, 'revoke')}>Revoke</button>
                    )}
                    {l.status === 'pending' && l.initiated_by === 'landlord' && (
                      <span className="muted">Awaiting dealer</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Commissions' && (
        <table className="table">
          <thead><tr><th>Dealer</th><th>Property</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id}>
                <td>{c.dealer_name}</td><td>{c.property_title}</td>
                <td>{formatPKR(c.amount)}</td><td><StatusBadge status={c.status} /></td>
                <td>
                  {c.status === 'pending' && (
                    <button
                      className="btn btn-small"
                      onClick={async () => {
                        await api(`/landlords/commissions/${c.id}/mark-paid`, { method: 'POST' });
                        load();
                      }}
                    >
                      Mark as paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
