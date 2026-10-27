import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      <header className="topbar">
        <Link to="/" className="brand">RentAasan</Link>
        <nav className="nav">
          {user?.role === 'landlord' && (
            <>
              <Link to="/landlord">Dashboard</Link>
              <Link to="/commissions">Commissions</Link>
            </>
          )}
          {user?.role === 'tenant' && <Link to="/tenant">Dashboard</Link>}
          {user?.role === 'dealer' && (
            <>
              <Link to="/dealer">Dashboard</Link>
              <Link to="/dealer/landlords">My Landlords</Link>
              <Link to="/dealer/properties">Properties</Link>
              <Link to="/dealer/inquiries">Inquiries</Link>
              <Link to="/dealer/commissions">Commissions</Link>
            </>
          )}
        </nav>
        <div className="topbar-right">
          {user && <span className="muted">{user.name} ({user.role})</span>}
          {user && <button className="btn btn-ghost" onClick={onLogout}>Logout</button>}
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
