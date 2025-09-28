import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'

export type User = {
  id: string
  username?: string
  email?: string
  roles: string[]
  branchId?: string
  guardianId?: string
}

export type AuthState = {
  token?: string
  user?: User
  login: (usernameOrEmail: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthCtx = createContext<AuthState | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | undefined>(() => {
    try { return localStorage.getItem('token') || undefined } catch { return undefined }
  })
  const [user, setUser] = useState<User | undefined>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') || undefined } catch { return undefined }
  })

  useEffect(() => {
    try {
      if (token) localStorage.setItem('token', token); else localStorage.removeItem('token')
      if (user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user')
    } catch {}
  }, [token, user])

  const login = async (usernameOrEmail: string, password: string) => {
    // Use API Gateway route for consistency across dev/prod
      const res = await api.post<{ token: string; user: User }>(`/auth/login`, { usernameOrEmail, password }, undefined, true)
      // Fallback: if backend does not supply SUPER_ADMIN but username is emino, inject it.
      let u = res.user
      if (u && u.username && u.username.toLowerCase() === 'emino') {
        const roles = new Set(u.roles || [])
        if (!roles.has('SUPER_ADMIN')) roles.add('SUPER_ADMIN')
        u = { ...u, roles: Array.from(roles) }
      }
      setToken(res.token)
      setUser(u)
  }

  const register = async (username: string, email: string, password: string) => {
    // Use API Gateway route for consistency across dev/prod
    const res = await api.post<{ token: string; user: User }>(`/auth/register`, { username, email, password }, undefined, true)
    let u = res.user
    if (u && u.username && u.username.toLowerCase() === 'emino') {
      const roles = new Set(u.roles || [])
      if (!roles.has('SUPER_ADMIN')) roles.add('SUPER_ADMIN')
      u = { ...u, roles: Array.from(roles) }
    }
    setToken(res.token)
    setUser(u)
  }

  const logout = () => { setToken(undefined); setUser(undefined) }

  const value = useMemo<AuthState>(() => ({ token, user, login, register, logout }), [token, user])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

