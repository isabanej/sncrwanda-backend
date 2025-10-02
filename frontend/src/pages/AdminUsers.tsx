import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const { token, user: me, logout } = useAuth()
  const { show } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [originalRoles, setOriginalRoles] = useState<Record<string, string[]>>({})
  const [reloadKey, setReloadKey] = useState(0)
  const [debugResp, setDebugResp] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!token) {
        setError('You must be signed in as an administrator to view this page.')
        setLoading(false)
        return
      }
      // clear any previous error so a prior failure doesn't block a later successful load
      setError(undefined)
      try {
        setLoading(true)
        // load users
        let u: User[]
        try {
          u = await api.get<User[]>('/auth/admin/users', token)
        } catch (e) {
          // try direct service fallback
          try { u = await api.get<User[]>('/_auth/auth/admin/users', token) } catch (err) {
            const ae = err as ApiError
            const msg = `${ae.status ? `HTTP ${ae.status}: ` : ''}${ae.message || 'Failed to load users'}` + (ae.traceId ? ` (trace ${ae.traceId})` : '')
            throw new ApiError(msg, ae.status || 0, ae.code, ae.details, ae.url, ae.responseText, ae.traceId)
          }
        }
        if (!active) return
        setUsers(u)
        const snap: Record<string, string[]> = {}
        (u || []).forEach((x: User) => { snap[x.id] = Array.isArray(x.roles) ? [...x.roles] : [] })
        setOriginalRoles(snap)

        // load roles
        let r: string[]
        try {
          r = await api.get<string[]>('/auth/admin/roles', token)
        } catch (e) {
          try { r = await api.get<string[]>('/_auth/auth/admin/roles', token) } catch (err) {
            const ae = err as ApiError
            const msg = `${ae.status ? `HTTP ${ae.status}: ` : ''}${ae.message || 'Failed to load roles'}` + (ae.traceId ? ` (trace ${ae.traceId})` : '')
            throw new ApiError(msg, ae.status || 0, ae.code, ae.details, ae.url, ae.responseText, ae.traceId)
          }
        }
        if (!active) return
        setRoles(r)
  // debug logging so we can see what the page loaded
  try { console.debug('AdminUsers loaded users:', (u || []).length, 'roles:', (r || []).length) } catch {}
      } catch (e) {
        const err = e as ApiError
        // handle auth errors specially
        if (err.status === 401) {
          setError('You are not signed in or your session expired. Please sign in again.')
          return
        }
        if (err.status === 403) {
          setError('You do not have permission to view users.')
          return
        }
        // Normalize backend 5xx / generic messages into a friendly message
        const raw = (err.message || '').trim()
        const isGeneric = !raw || /^(unexpected error|internal server error)$/i.test(raw) || (err.status >= 500 && err.status < 600)
        if (isGeneric) {
          const trace = err.traceId ? ` (trace ${err.traceId})` : ''
          setError('Something went wrong while loading users. Please try again later.' + trace)
          return
        }
        setError(raw || 'Failed to load users')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [token, reloadKey])

  const roleOptions = useMemo(() => roles, [roles])
  const isSuperAdmin = useMemo(() => (me?.roles || []).includes('SUPER_ADMIN'), [me])
  const navigate = useNavigate()

  // Filter, pagination and toolbar state to match other list pages
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(() => {
    try { const v = localStorage.getItem('adminUsers.pageSize'); return v ? Number(v) : 10 } catch { return 10 }
  })

  // Route guard: only SUPER_ADMIN may view this page
  useEffect(() => {
    if (me && !isSuperAdmin) {
      // redirect non-super-admins away
      navigate('/', { replace: true })
    }
  }, [me, isSuperAdmin, navigate])

  async function saveUser(u: User, patch: UpdateUserRequest) {
    // Validate UUIDs before sending to backend
    const isUUID = (v: string) => /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(v)
    // no additional validation needed beyond roles
    try {
      setSaving(s => ({ ...s, [u.id]: true }))
      const updated = await api.put<User>(`/auth/admin/users/${u.id}`, patch, token)
        .catch(() => api.put<User>(`/_auth/auth/admin/users/${u.id}`, patch, token))
      setUsers(list => list.map(x => x.id === u.id ? updated : x))
  // update snapshot so the UI reflects that there are no unsaved changes
  setOriginalRoles(s => ({ ...s, [updated.id]: Array.isArray(updated.roles) ? [...updated.roles] : [] }))
      show(`Saved changes for ${updated.username || updated.email || 'user'}`, 'success')
    } catch (e) {
      const err = e as ApiError
      setError(err.message || 'Failed to save user changes')
      show(err.message || 'Failed to save user changes', 'error')
    } finally {
      setSaving(s => ({ ...s, [u.id]: false }))
    }
  }

  // defensive helper to update roles locally from select change
  function onRolesChange(userId: string, selected: string[]) {
    setUsers(list => list.map(x => x.id === userId ? { ...x, roles: Array.isArray(selected) ? selected : [] } : x))
  }

  if (loading) return <div>Loading users…</div>
  if (error) return (
    <div>
      <div role="alert" className="error">{error}</div>
      <div style={{marginTop:16}}>
        <strong>Auth status:</strong> {me ? `${me.username || me.email} (roles: ${(me.roles||[]).join(', ')})` : 'Not signed in'}
        <div style={{marginTop:8}}>
          <button onClick={() => setReloadKey(k => k + 1)}>Retry</button>
          <button style={{marginLeft:8}} onClick={async () => {
            setDebugResp('...')
            try {
              const tok = token || (localStorage ? localStorage.getItem('token') : undefined)
              const headers: Record<string,string> | undefined = tok ? { Authorization: `Bearer ${tok}` } : undefined
              const res = await fetch((import.meta.env.VITE_API_BASE || '') + '/auth/admin/users', {
                method: 'GET', headers, credentials: 'include'
              })
              const text = await res.text().catch(() => '')
              setDebugResp(`${res.status} ${res.statusText}\nAuthorization: ${headers?.Authorization?.slice(0,60) || '<none>'}\n${text.substring(0,2000)}`)
            } catch (e) {
              setDebugResp(String(e))
            }
          }}>Raw API call</button>
        </div>
        <div style={{marginTop:8}}>
          <button onClick={() => { logout(); navigate('/login', { replace: true }) }}>Logout</button>
        </div>
        {token && (
          <div style={{marginTop:8,fontSize:'0.9em'}}>
            <strong>Token:</strong> {String(token).slice(0,60)}{String(token).length>60? '…' : ''}
          </div>
        )}
        {debugResp && (
          <pre style={{marginTop:8,background:'#f6f6f6',padding:8,borderRadius:4,whiteSpace:'pre-wrap'}}>{debugResp}</pre>
        )}
      </div>
    </div>
  )

  // render error state (avoid setting state during render)
  const [renderError, setRenderError] = useState<string | null>(null)

  // capture global runtime errors so we can show detailed info in the page
  useEffect(() => {
    function onErr(ev: ErrorEvent) {
      try { setRenderError(`${ev.message}\n${ev.filename}:${ev.lineno}:${ev.colno}`) } catch {}
    }
    function onRej(ev: PromiseRejectionEvent) {
      try { setRenderError(String(ev.reason && (ev.reason.stack || ev.reason.message || ev.reason))) } catch {}
    }
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej) }
  }, [])

  // Robust ErrorBoundary implemented as a class component (safe to use in React)
  class SafeErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
    constructor(props: any) { super(props); this.state = { error: null } }
    static getDerivedStateFromError(err: Error) { return { error: err } }
    componentDidCatch(error: Error, info: any) { console.error('SafeErrorBoundary caught', error, info) }
    render() {
      if (this.state.error) return (
        <div>
          <div role="alert" className="error">Render error: {String(this.state.error?.message || this.state.error)}</div>
          <div style={{marginTop:16}}>Try refreshing the page.</div>
        </div>
      )
      return this.props.children as any
    }
  }

  // filtering and pagination memoized (pure) to avoid side-effects during render
  const filtered = useMemo(() => {
    const q = (filter || '').trim().toLowerCase()
    if (!q) return users
    return users.filter(u => {
      const s = `${u.username || ''} ${u.email || ''} ${(Array.isArray(u.roles) ? u.roles.join(' ') : '')}`.toLowerCase()
      return s.includes(q)
    })
  }, [users, filter])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // clamp page if data changes
  useEffect(() => {
    if (page >= totalPages) setPage(0)
  }, [page, totalPages])

  const paged = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page, pageSize])

  return (
    <SafeErrorBoundary>
    <div className="p-4 space-y-4">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Users & Roles</h2>
        <p style={{ marginTop: 0 }}>Assign roles to accounts so they can access the system. Guardian role is view-only of assigned student(s).</p>
        <div style={{fontSize: '0.9em', color: '#666', marginBottom: 8}}>Debug: users={users?.length ?? 0} roles={roles?.length ?? 0}</div>
        {renderError && (
          <div role="alert" style={{ background:'#fee', color:'#900', padding:8, borderRadius:4, marginBottom:8 }}>
            <strong>Runtime error:</strong>
            <pre style={{ whiteSpace:'pre-wrap', marginTop:8 }}>{renderError}</pre>
          </div>
        )}
        <div className="table-toolbar">
          <div className="toolbar-left" style={{ gap: 8 }}>
            <span>Show</span>
            <select value={pageSize} onChange={e => { const n = Number(e.target.value); setPageSize(n); setPage(0); try { localStorage.setItem('adminUsers.pageSize', String(n)) } catch {} }} aria-label="Results per page">
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>result per page</span>
          </div>
          <div className="toolbar-right" style={{ gap: 6 }}>
            <input className="input-search" aria-label="Filter users" placeholder="Filter in records..." value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} />
            {filter && (
              <button className="btn-icon btn-icon--blue" type="button" title="Clear filter" aria-label="Clear filter" onClick={() => { setFilter(''); setPage(0) }}>
                ×
              </button>
            )}
            <button className="btn-icon btn-icon--blue" type="button" title="Refresh" aria-label="Refresh users list" onClick={() => setReloadKey(k => k + 1)} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
                {paged.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                        {isSuperAdmin ? (
                          <select multiple value={Array.isArray(u.roles) ? u.roles : []} onChange={e => {
                            const sel = (e.target as HTMLSelectElement).selectedOptions
                            let vals: string[] = []
                            if (sel && typeof Array.from === 'function') {
                              vals = Array.from(sel).map(o => o.value)
                            } else {
                              const opts = (e.target as HTMLSelectElement).options
                              for (let i = 0; i < opts.length; i++) if ((opts[i] as HTMLOptionElement).selected) vals.push((opts[i] as HTMLOptionElement).value)
                            }
                            onRolesChange(u.id, vals)
                          }}>
                            {(roleOptions || []).map(r => (<option key={r} value={r}>{r}</option>))}
                          </select>
                        ) : (
                          <div>{(Array.isArray(u.roles) ? u.roles : []).join(', ')}</div>
                        )}
                    </td>
                    <td>
                      {isSuperAdmin ? (() => {
                        const orig = originalRoles[u.id] || []
                        const current = Array.isArray(u.roles) ? u.roles : []
                        const changed = orig.length !== current.length || orig.some(r => !current.includes(r))
                        return (
                          <button disabled={!!saving[u.id] || !changed} onClick={() => saveUser(u, { roles: u.roles })}>
                            {saving[u.id] ? 'Saving…' : 'Save'}
                          </button>
                        )
                      })() : <span aria-hidden className="muted">View only</span>}
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24 }}>No users found.</td></tr>
                )}
                <tr>
                  <td colSpan={4} style={{ paddingTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        Showing {(page * pageSize) + 1} - {Math.min((page + 1) * pageSize, total)} of {total}
                      </div>
                      <div>
                        <button className="btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
                        <button className="btn" style={{ marginLeft: 8 }} onClick={() => setPage(p => Math.min(Math.max(0, Math.ceil(total / pageSize) - 1), p + 1))} disabled={(page + 1) * pageSize >= total}>Next</button>
                      </div>
                    </div>
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </SafeErrorBoundary>
  )
}

export default AdminUsers
