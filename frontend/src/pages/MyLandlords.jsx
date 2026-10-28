import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../i18n';

export default function MyLandlords() {
  const { t } = useLanguage();
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
      <h1>{t('myLandlords')}</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={invite} className="form card">
        <h3>{t('inviteLandlord')}</h3>
        <p className="muted">{t('inviteLandlordHint')}</p>
        <div className="row">
          <label>{t('landlordEmail')}<input value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        </div>
        <button className="btn btn-primary" type="submit">{t('sendInvite')}</button>
      </form>
      <table className="table">
        <thead><tr><th>{t('landlord')}</th><th>{t('property')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.id}>
              <td>{l.landlord_name}</td>
              <td>{l.property_title || t('allProperties')}</td>
              <td><StatusBadge status={l.status} /></td>
              <td>
                {l.status === 'pending' && l.initiated_by === 'landlord' && (
                  <>
                    <button className="btn btn-small" onClick={() => action(l.id, 'accept')}>{t('accept')}</button>{' '}
                    <button className="btn btn-small btn-ghost" onClick={() => action(l.id, 'reject')}>{t('reject')}</button>
                  </>
                )}
                {l.status === 'pending' && l.initiated_by === 'dealer' && (
                  <span className="muted">{t('awaitingLandlord')}</span>
                )}
                {l.status === 'active' && (
                  <button className="btn btn-small btn-danger" onClick={() => action(l.id, 'revoke')}>{t('revoke')}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
