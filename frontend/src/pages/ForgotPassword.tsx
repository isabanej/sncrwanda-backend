import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../lib/toast'
import { api, ApiError } from '../lib/api'
import SiteFooter from '../app/SiteFooter'

const ForgotPassword: React.FC = () => {
  // Email-only reset
  const [identifier, setIdentifier] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    let id = identifier.trim()
    // email format check (frontend only)
    const looksEmail = /.+@.+\..+/.test(id)
    if (!looksEmail) { setError('Enter a valid email address'); return }
    setBusy(true)
    try {
      // Call backend forgot-password endpoint (anonymous)
      await api.post<void>(`/_auth/auth/forgot-password`, { email: id }, undefined, true)
      setSent(true)
      toast.show("If an account exists, we've sent reset instructions.", 'info')
    } catch (e) {
      const err = e as ApiError
      if (err.status === 404) {
        setError('Email address not found. Please create a new account.')
        toast.show('Email address not found. Please create a new account.', 'error')
      } else {
        setError(err.message || 'Failed to send reset email')
        toast.show(err.message || 'Failed to send reset email', 'error')
      }
    } finally { setBusy(false) }
  }

  return (
    <>
    <section className="auth-page" aria-labelledby="fp-title">
      <div className="auth-container" role="region">
        <h1 id="fp-title" className="auth-title">Forgot password</h1>
  <p className="auth-sub">We'll send reset instructions to your email.</p>
        {!sent ? (
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="identifier" className="req">Email address</label>
              <input id="identifier" name="identifier" type="email" autoComplete="email" required placeholder={'Enter your email address'}
                     value={identifier} onChange={e => setIdentifier(e.target.value)} />
            </div>
            {error && <div className="error" role="alert">{error}</div>}
            <button type="submit" className="btn-black btn-lg w-100" disabled={busy}>{busy ? 'Sending…' : 'Send reset instructions'}</button>
            <p className="text-center mt-2 fs-sm"><Link className="link" to="/login">Back to Sign In</Link></p>
          </form>
        ) : (
          <div className="auth-form">
            <p className="muted">If an account exists for the provided email, password reset instructions will be sent shortly. Please check your inbox and spam folder before requesting a new link</p>
            <div className="row mt-3">
              <Link className="link" to="/login">Return to Sign In</Link>
              <button className="btn-black btn-lg" onClick={() => nav('/login', { replace: true })}>Done</button>
              <button className="btn-black btn-lg" onClick={onSubmit} disabled={busy}>Resend</button>
            </div>
          </div>
        )}
      </div>
    </section>
    <SiteFooter className="fs-sm" />
    </>
  )
}

export default ForgotPassword
