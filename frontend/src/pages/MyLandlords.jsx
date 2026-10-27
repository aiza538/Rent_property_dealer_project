import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function MyLandlords() {
  const [links, setLinks] = useState([]);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [propertyId, setPropertyId] = useState('');

  async function load() {
    try {
      setLinks(await api('/dealers/landlords'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function invite(e) {
    e.preventDefault();
    await api('/dealers/links/invite-landlord', {
      method: 'POST',
      body: { email, property_id: propertyId ? Number(propertyId) : null },
    });
    setEmail('');
    load();
  }

  async function action(linkId, act) {
    await api(`/dealers/links/${linkId}/${act}`, { method: 'POST' });
    load();
  }

  return (
    <div>
      <h1>My Landlords</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={invite} className="form card">
        <h3>Invite a landlord</h3>
        <p className="muted">The landlord must already have a RentAasan landlord account. They approve the request before you get access.</p>
        <div className="row">
          <label>Landlord email<input value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        </div>
        <button className="btn btn-primary" type="submit">Send invite</button>
      </form>
      <table className="table">
        <thead><tr><th>Landlord</th><th>Property</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.id}>
              <td>{l.landlord_name}</td>
              <td>{l.property_title || 'All properties'}</td>
              <td><StatusBadge status={l.status} /></td>
              <td>
                {l.status === 'pending' && l.initiated_by === 'landlord' && (
                  <>
                    <button className="btn btn-small" onClick={() => action(l.id, 'accept')}>Accept</button>{' '}
                    <button className="btn btn-small btn-ghost" onClick={() => action(l.id, 'reject')}>Reject</button>
                  </>
                )}
                {l.status === 'pending' && l.initiated_by === 'dealer' && (
                  <span className="muted">Awaiting landlord</span>
                )}
                {l.status === 'active' && (
                  <button className="btn btn-small btn-danger" onClick={() => action(l.id, 'revoke')}>Revoke</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
