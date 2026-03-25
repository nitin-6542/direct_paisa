import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import CompanyDashboard from './components/CompanyDashboard';
import AttendanceScreen from './components/AttendanceScreen';
import LiveLocationScreen from './components/LiveLocationScreen';
import TeamManagementScreen from './components/TeamManagementScreen';
import LeadsListScreen from './components/LeadsListScreen';
import ProfileScreen from './components/ProfileScreen';
import AboutUsScreen from './components/AboutUsScreen';
import EmiCalculatorScreen from './components/EmiCalculatorScreen';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginScreen />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/companies" element={
        <ProtectedRoute>
          <Layout>
            <CompanyDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/attendance" element={
        <ProtectedRoute>
          <Layout>
            <AttendanceScreen />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/live-location" element={
        <ProtectedRoute>
          <Layout>
            <LiveLocationScreen />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/team" element={
        <ProtectedRoute>
          <Layout>
            <TeamManagementScreen />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/leads" element={
        <ProtectedRoute>
          <Layout>
            <LeadsListScreen />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout>
            <ProfileScreen />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/about" element={
        <ProtectedRoute>
          <Layout>
            <AboutUsScreen />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/emi-calculator" element={
        <ProtectedRoute>
          <Layout>
            <EmiCalculatorScreen />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
