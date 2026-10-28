import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../AuthContext';
import { useLanguage } from '../i18n';

export default function Register() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'landlord' });
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await register(form);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card narrow">
      <h1>{t('registerTitle')}</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={onSubmit} className="form">
        <label>{t('name')}<input value={form.name} onChange={(e) => set('name', e.target.value)} required /></label>
        <label>{t('email')}<input value={form.email} onChange={(e) => set('email', e.target.value)} required /></label>
        <label>{t('phone')}<input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label>{t('password')}<input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} /></label>
        <small className="muted">{t('atLeast6')}</small>
        <label>{t('role')}
          <select value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="landlord">{t('roleLandlord')}</option>
            <option value="tenant">{t('roleTenant')}</option>
            <option value="dealer">{t('roleDealer')}</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">{t('register')}</button>
      </form>
      <p className="muted">{t('haveAccount')} <Link to="/login">{t('login')}</Link></p>
    </div>
  );
}
