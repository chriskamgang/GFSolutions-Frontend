import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import { AuthProvider, useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { theme } from './styles/theme';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Savings from './pages/Savings';
import Credits from './pages/Credits';
import Companies from './pages/Companies';
import Agencies from './pages/Agencies';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import Treasury from './pages/Treasury';
import Accounting from './pages/Accounting';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Checkbooks from './pages/Checkbooks';
import Tontines from './pages/Tontines';
import SavingsGoals from './pages/SavingsGoals';
import Notifications from './pages/Notifications';
import BillPayments from './pages/BillPayments';
import Callbox from './pages/Callbox';
import PaymentGateway from './pages/PaymentGateway';
import MobileMoney from './pages/MobileMoney';
import SolidarityGroups from './pages/SolidarityGroups';
import AmlAlerts from './pages/AmlAlerts';
import './styles/global.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Route protegee par permission — redirige vers le dashboard si acces interdit */
function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission: string }) {
  const { hasPermission } = usePermissions();
  if (!hasPermission(permission)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<ProtectedRoute permission="CLIENTS:READ"><Clients /></ProtectedRoute>} />
        <Route path="accounts" element={<ProtectedRoute permission="ACCOUNTS:READ"><Accounts /></ProtectedRoute>} />
        <Route path="transactions" element={<ProtectedRoute permission="TRANSACTIONS:READ"><Transactions /></ProtectedRoute>} />
        <Route path="savings" element={<ProtectedRoute permission="CONTRIBUTIONS:READ"><Savings /></ProtectedRoute>} />
        <Route path="credits" element={<ProtectedRoute permission="CREDITS:READ"><Credits /></ProtectedRoute>} />
        <Route path="treasury" element={<ProtectedRoute permission="TRANSACTIONS:READ"><Treasury /></ProtectedRoute>} />
        <Route path="accounting" element={<ProtectedRoute permission="ACCOUNTING:READ"><Accounting /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute permission="REPORTS:READ"><Reports /></ProtectedRoute>} />
        <Route path="companies" element={<ProtectedRoute permission="COMPANIES:READ"><Companies /></ProtectedRoute>} />
        <Route path="agencies" element={<ProtectedRoute permission="AGENCIES:READ"><Agencies /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute permission="USERS:READ"><Users /></ProtectedRoute>} />
        <Route path="roles" element={<ProtectedRoute permission="ROLES:READ"><Roles /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute permission="AUDIT:READ"><Audit /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute permission="SETTINGS:READ"><Settings /></ProtectedRoute>} />
        <Route path="checkbooks" element={<ProtectedRoute permission="TRANSACTIONS:READ"><Checkbooks /></ProtectedRoute>} />
        <Route path="tontines" element={<ProtectedRoute permission="CONTRIBUTIONS:READ"><Tontines /></ProtectedRoute>} />
        <Route path="savings-goals" element={<ProtectedRoute permission="CONTRIBUTIONS:READ"><SavingsGoals /></ProtectedRoute>} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="bill-payments" element={<BillPayments />} />
        <Route path="callbox" element={<ProtectedRoute permission="USERS:READ"><Callbox /></ProtectedRoute>} />
        <Route path="payment-gateway" element={<PrivateRoute><PaymentGateway /></PrivateRoute>} />
        <Route path="mobile-money" element={<ProtectedRoute permission="TRANSACTIONS:READ"><MobileMoney /></ProtectedRoute>} />
        <Route path="solidarity-groups" element={<ProtectedRoute permission="CLIENTS:READ"><SolidarityGroups /></ProtectedRoute>} />
        <Route path="aml-alerts" element={<ProtectedRoute permission="REPORTS:READ"><AmlAlerts /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={frFR}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
