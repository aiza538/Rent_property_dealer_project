import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
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
      <h1>Create your RentAasan account</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={onSubmit} className="form">
        <label>Name<input value={form.name} onChange={(e) => set('name', e.target.value)} required /></label>
        <label>Email<input value={form.email} onChange={(e) => set('email', e.target.value)} required /></label>
        <label>Phone<input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} /></label>
        <small className="muted">At least 6 characters</small>
        <label>Role
          <select value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
            <option value="dealer">Property Dealer</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">Register</button>
      </form>
      <p className="muted">Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
