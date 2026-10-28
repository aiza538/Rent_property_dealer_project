import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../AuthContext';
import { useLanguage } from '../i18n';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card narrow">
      <h1>{t('loginTitle')}</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={onSubmit} className="form">
        <label>{t('email')}<input value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>{t('password')}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn btn-primary" type="submit">{t('login')}</button>
      </form>
      <p className="muted">{t('noAccount')} <Link to="/register">{t('register')}</Link></p>
    </div>
  );
}
