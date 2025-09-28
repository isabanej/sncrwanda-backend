import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../lib/auth'
import { ToastProvider } from '../lib/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter>
          <div id="app-root">
            {children}
          </div>
          <div id="modal-root" />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

