import React, { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

export type User = {
  id: string
  username?: string
  email?: string
  roles: string[]
  // Removed branch and guardian per new requirements
}

type UpdateUserRequest = {
  roles?: string[]
}

const AdminUsers: React.FC = () => {
  const { token } = useAuth()
  const { show } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const [u, r] = await Promise.all([
          // Use gateway route when available; fallback to direct service via /_auth which rewrites to '' on 9092, so include '/auth' prefix
          api.get<User[]>('/auth/admin/users', token).catch(() => api.get<User[]>('/_auth/auth/admin/users', token)),
          api.get<string[]>('/auth/admin/roles', token).catch(() => api.get<string[]>('/_auth/auth/admin/roles', token))
        ])
        if (!active) return
        setUsers(u)
        setRoles(r)
      } catch (e) {
        const err = e as ApiError
        setError(err.message || 'Failed to load users')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [token])

  const roleOptions = useMemo(() => roles, [roles])

  async function saveUser(u: User, patch: UpdateUserRequest) {
    // Validate UUIDs before sending to backend
    const isUUID = (v: string) => /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(v)
    // no additional validation needed beyond roles
    try {
      setSaving(s => ({ ...s, [u.id]: true }))
      const updated = await api.put<User>(`/auth/admin/users/${u.id}`, patch, token)
        .catch(() => api.put<User>(`/_auth/auth/admin/users/${u.id}`, patch, token))
      setUsers(list => list.map(x => x.id === u.id ? updated : x))
      show(`Saved changes for ${updated.username || updated.email || 'user'}`, 'success')
    } catch (e) {
      const err = e as ApiError
      setError(err.message || 'Failed to save user changes')
      show(err.message || 'Failed to save user changes', 'error')
    } finally {
      setSaving(s => ({ ...s, [u.id]: false }))
    }
  }

  if (loading) return <div>Loading users…</div>
  if (error) return <div role="alert" className="error">{error}</div>

  return (
    <div>
      <h1>Users & Roles</h1>
      <p>Assign roles to accounts so they can access the system. Guardian role is view-only of assigned student(s).</p>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Roles</th>
              {/* Branch/Guardian columns removed */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <select multiple value={u.roles} onChange={e => {
                    const vals = Array.from(e.target.selectedOptions).map(o => o.value)
                    setUsers(list => list.map(x => x.id === u.id ? { ...x, roles: vals } : x))
                  }}>
                    {roleOptions.map(r => (<option key={r} value={r}>{r}</option>))}
                  </select>
                </td>
                {/* Removed Branch/Guardian editors */}
                <td>
                  <button disabled={!!saving[u.id]} onClick={() => saveUser(u, { roles: u.roles })}>
                    {saving[u.id] ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminUsers
