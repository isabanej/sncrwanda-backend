import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../lib/toast'
import { api } from '../lib/api'

const ResetPassword: React.FC = () => {
  const [search] = useSearchParams()
  const initialToken = search.get('token') || ''
  const [token, setToken] = useState(initialToken)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string>()
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    if (!token) { setError('Missing reset token'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setBusy(true)
    try {
      await api.post<void>(`/_auth/auth/reset-password`, { token, newPassword: password }, undefined, true)
      setDone(true)
      toast.show('Password updated. You can now sign in.', 'success')
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('UNAUTHORIZED') || msg.toLowerCase().includes('expired')) {
        setError('Your reset link is invalid or has expired. Request a new one below.')
      } else if (msg.includes('NEW_PASSWORD_SAME_AS_CURRENT')) {
        setError('Your new password must be different from your current password.')
      } else {
        setError('Reset failed. Please try again.')
      }
    } finally { setBusy(false) }
  }

  return (
    <section className="auth-page" aria-labelledby="rp-title">
      <div className="auth-container" role="region">
        <h1 id="rp-title" className="auth-title">Reset password</h1>
        <p className="auth-sub">Enter your new password below.</p>
        {!done ? (
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="token" className="req">Reset Token</label>
              <input id="token" name="token" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your reset token" />
            </div>
            <div className="field">
              <label htmlFor="password" className="req">New Password</label>
              <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter new password" />
            </div>
            <div className="field">
              <label htmlFor="confirm" className="req">Confirm Password</label>
              <input id="confirm" name="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" />
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
                {error.includes('expired') && (
                  <div className="mt-1">
                    <Link className="link" to="/forgot-password">Request a new reset link</Link>
                  </div>
                )}
              </div>
            )}
            <button type="submit" className="btn-black btn-lg w-100" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
            <p className="text-center mt-2 fs-sm"><Link className="link" to="/login">Back to Sign In</Link></p>
          </form>
        ) : (
          <div className="auth-form">
            <p className="muted">Your password has been updated.</p>
            <div className="row mt-3">
              <Link className="link" to="/login">Go to Sign In</Link>
              <button className="btn-black btn-lg" onClick={() => nav('/login', { replace: true })}>Sign in</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ResetPassword
