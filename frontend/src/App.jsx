import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, homeForRole, useAuth } from './AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './ProtectedRoute';
import Agreements from './pages/Agreements';
import Commissions from './pages/Commissions';
import DealerDashboard from './pages/DealerDashboard';
import DealerProperties from './pages/DealerProperties';
import Inquiries from './pages/Inquiries';
import LandlordDashboard from './pages/LandlordDashboard';
import Login from './pages/Login';
import MyLandlords from './pages/MyLandlords';
import Register from './pages/Register';
import TenantDashboard from './pages/TenantDashboard';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/landlord"
            element={<ProtectedRoute roles={['landlord']}><LandlordDashboard /></ProtectedRoute>}
          />
          <Route
            path="/tenant"
            element={<ProtectedRoute roles={['tenant']}><TenantDashboard /></ProtectedRoute>}
          />
          <Route
            path="/dealer"
            element={<ProtectedRoute roles={['dealer']}><DealerDashboard /></ProtectedRoute>}
          />
          <Route
            path="/dealer/landlords"
            element={<ProtectedRoute roles={['dealer']}><MyLandlords /></ProtectedRoute>}
          />
          <Route
            path="/dealer/properties"
            element={<ProtectedRoute roles={['dealer']}><DealerProperties /></ProtectedRoute>}
          />
          <Route
            path="/dealer/inquiries"
            element={<ProtectedRoute roles={['dealer']}><Inquiries /></ProtectedRoute>}
          />
          <Route
            path="/dealer/agreements"
            element={<ProtectedRoute roles={['dealer']}><Agreements /></ProtectedRoute>}
          />
          <Route
            path="/dealer/commissions"
            element={<ProtectedRoute roles={['dealer']}><Commissions /></ProtectedRoute>}
          />
          <Route
            path="/commissions"
            element={<ProtectedRoute roles={['landlord', 'dealer']}><Commissions /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
