import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
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
      <h1>Login to RentAasan</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={onSubmit} className="form">
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn btn-primary" type="submit">Login</button>
      </form>
      <p className="muted">No account? <Link to="/register">Register</Link></p>
    </div>
  );
}
