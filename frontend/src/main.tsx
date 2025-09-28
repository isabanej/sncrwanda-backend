import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './app/App'
import Login from './pages/Login'
import Register from './pages/Register'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import Services from './pages/Services'
import Students from './pages/Students'
import Reports from './pages/Reports'
import Employees from './pages/Employees'
import Ledger from './pages/Ledger'
import GuardianPortal from './pages/GuardianPortal'
import Guardians from './pages/Guardians'
import Schedule from './pages/Schedule'
import Appointment from './pages/Appointment'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './lib/toast'
import AdminUsers from './pages/AdminUsers'

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const RoleProtected: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (!user?.roles?.some(r => roles.includes(r))) return <Navigate to="/" replace />
  return <>{children}</>
}

// Index route: redirect anonymous users to /login; authenticated users to /dashboard
const HomeIndex: React.FC = () => {
  const { token } = useAuth()
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<HomeIndex />} />
              <Route path="about" element={<About />} />
              <Route path="services" element={<Services />} />
              <Route path="appointment" element={<Appointment />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="terms" element={<Terms />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="students" element={<RoleProtected roles={["ADMIN","TEACHER","SUPER_ADMIN"]}><Students /></RoleProtected>} />
              <Route path="guardians" element={<RoleProtected roles={["ADMIN","TEACHER","SUPER_ADMIN"]}><Guardians /></RoleProtected>} />
              <Route path="schedule" element={<RoleProtected roles={["ADMIN","TEACHER","SUPER_ADMIN"]}><Schedule /></RoleProtected>} />
              <Route path="reports" element={<RoleProtected roles={["ADMIN","TEACHER","SUPER_ADMIN"]}><Reports /></RoleProtected>} />
              <Route path="employees" element={<RoleProtected roles={["ADMIN","SUPER_ADMIN"]}><Employees /></RoleProtected>} />
              <Route path="ledger" element={<RoleProtected roles={["ADMIN","SUPER_ADMIN"]}><Ledger /></RoleProtected>} />
              <Route path="guardian" element={<RoleProtected roles={["GUARDIAN","ADMIN"]}><GuardianPortal /></RoleProtected>} />
              <Route path="admin/users" element={<RoleProtected roles={["ADMIN","SUPER_ADMIN"]}><AdminUsers /></RoleProtected>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
)
