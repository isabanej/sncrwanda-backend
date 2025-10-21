import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { Guardians } from './pages/Guardians';
import { Students } from './pages/Students';
import { Employees } from './pages/Employees';
import { Ledger } from './pages/Ledger';
import { UserManagement } from './pages/UserManagement';
import { GuardianPortal } from './pages/GuardianPortal';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/guardians" element={<Guardians />} />
              <Route path="/students" element={<Students />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/guardian-portal" element={<GuardianPortal />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
