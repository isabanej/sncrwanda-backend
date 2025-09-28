import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

type Summary = {
  employeeCount: number
  studentCount: number
  transactionCount: number
  studentReportCount: number
  totalTransactionAmount: string | number
}

const StatCard: React.FC<{ label: string; value: React.ReactNode; helper?: string }>
= ({ label, value, helper }) => (
  <div className="card" role="group" aria-label={label}>
    <div className="helper">{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{value}</div>
    {helper && <div className="helper">{helper}</div>}
  </div>
)

const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let on = true
    async function load() {
      try {
        // Try gateway first
        let s = await api.get<Summary>('/reports/summary', token)
        if (on) setSummary(s)
      } catch (e: any) {
        // Handle auth errors explicitly
        if (e && typeof e === 'object' && 'status' in e && (e.status === 401 || e.status === 403)) {
          if (on) setError('Your session expired. Please login again.')
          logout()
          navigate('/login', { replace: true })
          return
        }
        // Fallback to direct reporting service during dev if gateway has routing issues
        try {
          let s2 = await api.get<Summary>('/_reporting/reports/summary', token)
          if (on) setSummary(s2)
        } catch (err2: any) {
          if (on) setError((err2?.message) || (e?.message) || 'Failed to load summary')
        }
      }
    }
    load()
    return () => { on = false }
  }, [token, logout, navigate])

  return (
    <section className="container" aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" style={{ marginBlock: '1rem' }}>Dashboard</h1>

      {user && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Welcome{user.username ? `, ${user.username}` : ''}</h3>
          <div className="helper">Here’s a quick snapshot of the system.</div>
        </div>
      )}

      {/* Quick links intentionally removed per request */}

      {error && <div className="error" role="alert">{error}</div>}
      <div className="grid cols-2">
        <StatCard label="Students" value={summary?.studentCount ?? '—'} />
        <StatCard label="Employees" value={summary?.employeeCount ?? '—'} />
        <StatCard label="Transactions" value={summary?.transactionCount ?? '—'} />
        <StatCard label="Student Reports" value={summary?.studentReportCount ?? '—'} />
      </div>
    </section>
  )
}

export default Dashboard
