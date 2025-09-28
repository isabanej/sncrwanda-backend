import React, { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

type Transaction = {
  id: string
  type?: 'INCOME' | 'EXPENSE'
  category?: string
  name?: string
  amount?: number
  txDate?: string
}

const Ledger: React.FC = () => {
  const { token } = useAuth()
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    let on = true
    async function load() {
      try {
        setLoading(true)
        // Try gateway route first; fallback to direct Ledger service
        const data = await api.get<Transaction[]>('/transactions', token)
          .catch(() => api.get<Transaction[]>('/_ledger/transactions', token))
        if (!on) return
        setTxs(data)
      } catch (e) {
        const err = e as ApiError
        setError(err.message || 'Failed to load transactions')
      } finally {
        if (on) setLoading(false)
      }
    }
    load()
    return () => { on = false }
  }, [token])

  return (
    <section className="auth-page" aria-labelledby="ledger-title">
      <div className="auth-container" role="region">
        <h1 id="ledger-title" className="auth-title">Ledger</h1>
        <p className="auth-sub">View and manage financial transactions.</p>
        {loading && <p>Loading…</p>}
        {error && <p role="alert" className="error">{error}</p>}
        {!loading && !error && (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(t => (
                  <tr key={t.id}>
                    <td>{t.txDate || '—'}</td>
                    <td>{t.type || '—'}</td>
                    <td>{t.category || '—'}</td>
                    <td>{t.name || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{t.amount?.toLocaleString?.() ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default Ledger
