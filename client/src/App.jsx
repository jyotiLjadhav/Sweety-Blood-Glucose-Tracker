import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Logo } from './components/Icon';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Readings from './pages/Readings';
import AddReading from './pages/AddReading';
import Reports from './pages/Reports';
import CustomCursor from './components/CustomCursor';

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading">
      <Logo size={64} />
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Layout />;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Splash />;

return (
    <>
      <CustomCursor />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoutes />}>
          <Route index element={<Dashboard />} />
          <Route path="readings" element={<Readings />} />
          <Route path="add" element={<AddReading />} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
