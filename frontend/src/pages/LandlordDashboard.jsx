import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatAFN } from '../constants';
import { useLanguage } from '../i18n';

const TABS = ['overview', 'properties', 'tenants', 'complaints', 'dealers', 'commissions'];
const TAB_LABELS = {
  overview: 'overview',
  properties: 'properties',
  tenants: 'tenants',
  complaints: 'complaints',
  dealers: 'dealers',
  commissions: 'commissions',
};

export default function LandlordDashboard() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
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
      <h1>{t('landlordDashboard')}</h1>
      {error && <p className="error">{error}</p>}
      <div className="tabs">
        {TABS.map((tb) => (
          <button key={tb} className={tab === tb ? 'tab active' : 'tab'} onClick={() => setTab(tb)}>{t(TAB_LABELS[tb])}</button>
        ))}
      </div>

      {tab === 'overview' && summary && (
        <div className="grid">
          <div className="card"><h3>{t('rentReceived')}</h3><p className="big">{formatAFN(summary.received)}</p></div>
          <div className="card"><h3>{t('rentPending')}</h3><p className="big">{formatAFN(summary.pending)}</p></div>
          <div className="card"><h3>{t('totalIncome')}</h3><p className="big">{formatAFN(summary.total_income)}</p></div>
          <div className="card"><h3>{t('properties')}</h3><p className="big">{properties.length}</p></div>
          <div className="card"><h3>{t('activeTenancies')}</h3><p className="big">{tenancies.filter((tn) => tn.status === 'active').length}</p></div>
          <div className="card"><h3>{t('openComplaints')}</h3><p className="big">{complaints.filter((c) => c.status !== 'resolved').length}</p></div>
        </div>
      )}

      {tab === 'properties' && (
        <div>
          <form onSubmit={addProperty} className="form card">
            <h3>{t('addProperty')}</h3>
            <div className="row">
              <label>{t('title')}<input value={propForm.title} onChange={(e) => setPropForm({ ...propForm, title: e.target.value })} required /></label>
              <label>{t('monthlyRent')}<input type="number" value={propForm.monthly_rent} onChange={(e) => setPropForm({ ...propForm, monthly_rent: e.target.value })} required /></label>
            </div>
            <label>{t('address')}<input value={propForm.address} onChange={(e) => setPropForm({ ...propForm, address: e.target.value })} required /></label>
            <div className="row">
              <label>{t('area')}<input value={propForm.area} onChange={(e) => setPropForm({ ...propForm, area: e.target.value })} /></label>
              <label>{t('city')}<input value={propForm.city} onChange={(e) => setPropForm({ ...propForm, city: e.target.value })} /></label>
              <label>{t('type')}
                <select value={propForm.property_type} onChange={(e) => setPropForm({ ...propForm, property_type: e.target.value })}>
                  <option value="house">{t('house')}</option>
                  <option value="flat">{t('flat')}</option>
                  <option value="shop">{t('shop')}</option>
                  <option value="plot">{t('plot')}</option>
                </select>
              </label>
            </div>
            <button className="btn btn-primary" type="submit">{t('addProperty')}</button>
          </form>
          <table className="table">
            <thead><tr><th>{t('title')}</th><th>{t('area')}</th><th>{t('rent')}</th><th>{t('occupied')}</th></tr></thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td><td>{p.area}, {p.city}</td>
                  <td>{formatAFN(p.monthly_rent)}</td><td>{p.is_occupied ? t('yes') : t('no')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tenants' && (
        <div>
          <form onSubmit={addTenancy} className="form card">
            <h3>{t('addTenancyHint')}</h3>
            <div className="row">
              <label>{t('property')}
                <select value={tenancyForm.property_id} onChange={(e) => setTenancyForm({ ...tenancyForm, property_id: e.target.value })} required>
                  <option value="">{t('select')}</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
              <label>{t('tenantEmail')}<input value={tenancyForm.tenant_email} onChange={(e) => setTenancyForm({ ...tenancyForm, tenant_email: e.target.value })} required /></label>
            </div>
            <div className="row">
              <label>{t('monthlyRent')}<input type="number" value={tenancyForm.monthly_rent} onChange={(e) => setTenancyForm({ ...tenancyForm, monthly_rent: e.target.value })} required /></label>
              <label>{t('dueDay')}<input type="number" min="1" max="31" value={tenancyForm.due_day} onChange={(e) => setTenancyForm({ ...tenancyForm, due_day: e.target.value })} required /></label>
              <label>{t('startDate')}<input type="date" value={tenancyForm.start_date} onChange={(e) => setTenancyForm({ ...tenancyForm, start_date: e.target.value })} required /></label>
            </div>
            <button className="btn btn-primary" type="submit">{t('addTenancy')}</button>
          </form>
          <table className="table">
            <thead><tr><th>{t('property')}</th><th>{t('tenant')}</th><th>{t('rent')}</th><th>{t('dueDay')}</th><th>{t('status')}</th></tr></thead>
            <tbody>
              {tenancies.map((tn) => (
                <tr key={tn.id}>
                  <td>{tn.property_title}</td><td>{tn.tenant_name}</td>
                  <td>{formatAFN(tn.monthly_rent)}</td><td>{tn.due_day}</td>
                  <td><StatusBadge status={tn.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'complaints' && (
        <table className="table">
          <thead><tr><th>{t('property')}</th><th>{t('tenant')}</th><th>{t('title')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead>
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
                    <option value="open">{t('stOpen')}</option>
                    <option value="in_progress">{t('stInProgress')}</option>
                    <option value="resolved">{t('stResolved')}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'dealers' && (
        <div>
          <form onSubmit={inviteDealer} className="form card">
            <h3>{t('inviteDealer')}</h3>
            <div className="row">
              <label>{t('dealerEmail')}<input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required /></label>
              <label>{t('propertyOptional')}
                <select value={invitePropertyId} onChange={(e) => setInvitePropertyId(e.target.value)}>
                  <option value="">{t('allProperties')}</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
            </div>
            <button className="btn btn-primary" type="submit">{t('sendInvite')}</button>
          </form>
          <table className="table">
            <thead><tr><th>{t('dealer')}</th><th>{t('business')}</th><th>{t('property')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <td>{l.dealer_name}</td><td>{l.dealer_business_name || '—'}</td>
                  <td>{l.property_title || t('allProperties')}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>
                    {l.status === 'pending' && l.initiated_by === 'dealer' && (
                      <>
                        <button className="btn btn-small" onClick={() => linkAction(l.id, 'approve')}>{t('approve')}</button>{' '}
                        <button className="btn btn-small btn-ghost" onClick={() => linkAction(l.id, 'reject')}>{t('reject')}</button>
                      </>
                    )}
                    {l.status === 'active' && (
                      <button className="btn btn-small btn-danger" onClick={() => linkAction(l.id, 'revoke')}>{t('revoke')}</button>
                    )}
                    {l.status === 'pending' && l.initiated_by === 'landlord' && (
                      <span className="muted">{t('awaitingDealer')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'commissions' && (
        <table className="table">
          <thead><tr><th>{t('dealer')}</th><th>{t('property')}</th><th>{t('amount')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id}>
                <td>{c.dealer_name}</td><td>{c.property_title}</td>
                <td>{formatAFN(c.amount)}</td><td><StatusBadge status={c.status} /></td>
                <td>
                  {c.status === 'pending' && (
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
