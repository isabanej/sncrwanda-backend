import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import { AuthProvider } from '../lib/auth'
import Login from '../pages/Login'
import { ToastProvider } from '../lib/toast'

test('redirects index to login for anonymous (no header)', () => {
  render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Login />} />
              <Route path="login" element={<Login />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  )
  expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Sign in/i, level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  expect(screen.queryByText('Appointment')).not.toBeInTheDocument()
})
