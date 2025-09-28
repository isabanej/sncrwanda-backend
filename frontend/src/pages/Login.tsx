import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { ApiError } from '../lib/api'
import { validateLogin, validateLoginField } from '../lib/validation'
import { MSG } from '../lib/messages'
import SiteFooter from '../app/SiteFooter'

const Login: React.FC = () => {
  const nav = useNavigate()
  const { login } = useAuth()
  const toast = useToast()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  // Phone login removed; keep only email or username
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<{ usernameOrEmail?: string; password?: string }>({})
  const [touched, setTouched] = useState<{ usernameOrEmail?: boolean; password?: boolean }>({})
  const [busy, setBusy] = useState(false)

  function setField<K extends 'usernameOrEmail' | 'password'>(field: K, value: string) {
    if (field === 'usernameOrEmail') setUsernameOrEmail(value)
    if (field === 'password') setPassword(value)
    if (touched[field]) {
      const err = validateLoginField(field as any, value as any)
      setFieldErrors(prev => ({ ...prev, [field]: err }))
    }
  }

  function onBlurField<K extends 'usernameOrEmail' | 'password'>(field: K, value: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
    const err = validateLoginField(field as any, value as any)
    setFieldErrors(prev => ({ ...prev, [field]: err }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    setFieldErrors({})
    // Only email or username supported
    const submittedUsername = usernameOrEmail

    const v = validateLogin({ usernameOrEmail: submittedUsername, password })
    if (v.valid === false) {
      setFieldErrors(v.errors)
      const msg = MSG.enterCredentials
      setError(msg)
      toast.show(msg, 'error')
      return
    }
    if (!agree) {
      const msg = 'Please agree to the Terms of use and Privacy Policy'
      setError(msg)
      toast.show(msg, 'error')
      return
    }
    setBusy(true)
    try {
  await login(submittedUsername, password)
  toast.show(MSG.loggedIn, 'success')
  nav('/dashboard', { replace: true })
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message || 'Login failed' : (err?.message || 'Login failed')
      setError(msg)
      toast.show(msg, 'error')
    } finally { setBusy(false) }
  }

  return (
    <>
    <section className="auth-page">
      <div className="auth-container" role="region" aria-labelledby="login-title">
        <h1 className="auth-title" id="login-title">Sign in</h1>
        <p className="auth-sub">Please enter your details to continue</p>
        <form id="login-form" className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="username" className="req">Email or Username</label>
            <input id="username" name="username" autoComplete="username" required placeholder={'Enter your email or username'}
                 aria-invalid={!!fieldErrors.usernameOrEmail} aria-describedby={fieldErrors.usernameOrEmail ? 'login-username-error' : undefined}
                 value={usernameOrEmail}
                 onChange={e => setField('usernameOrEmail', e.target.value)}
                 onBlur={e => onBlurField('usernameOrEmail', e.target.value)} />
            {fieldErrors.usernameOrEmail && <div id="login-username-error" className="error" role="alert">{fieldErrors.usernameOrEmail}</div>}
          </div>
          <div className="field">
            <label htmlFor="password" className="req">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Enter your password"
                   aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                   value={password}
                   onChange={e => setField('password', e.target.value)}
                   onBlur={e => onBlurField('password', e.target.value)} />
            {fieldErrors.password && <div id="login-password-error" className="error" role="alert">{fieldErrors.password}</div>}
          </div>
          {error && <div className="error" role="alert">{error}</div>}
          <div className="row mt-2 mb-3">
            <span />
            <Link className="link fs-sm" to="/forgot-password">Forgot password?</Link>
          </div>
          <div className="fs-sm" style={{ display:'grid', gridTemplateColumns:'auto 1fr', alignItems:'start', gap:8 }}>
            <input id="agree" type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
            <label htmlFor="agree">By logging-in, you accept the <Link className="link" to="/terms">Terms of use</Link> including <Link className="link" to="/privacy">Privacy Policy</Link>.</label>
          </div>
          <button type="submit" className="btn-black btn-lg w-100" disabled={busy || !agree}>{busy ? 'Signing in…' : 'Sign In'}</button>
          <p className="text-center mt-2 fs-sm">Don’t have an account? <Link className="link" to="/register">Create Account</Link></p>
        </form>
        {/* Terms message moved into the form with a required checkbox */}
      </div>
    </section>
    <SiteFooter className="fs-sm" />
    </>
  )
}

export default Login
