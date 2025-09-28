import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { ApiError } from '../lib/api'
import { validateRegister, validateRegisterField } from '../lib/validation'
import { MSG } from '../lib/messages'
import SiteFooter from '../app/SiteFooter'

const Register: React.FC = () => {
  const nav = useNavigate()
  const { register } = useAuth()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({})
  const [touched, setTouched] = useState<{ username?: boolean; email?: boolean; password?: boolean }>({})
  const [busy, setBusy] = useState(false)

  function setField<K extends 'username' | 'email' | 'password'>(field: K, value: string) {
    // update value
    if (field === 'username') setUsername(value)
    if (field === 'email') setEmail(value)
    if (field === 'password') setPassword(value)
    // live-validate if touched
    if (touched[field]) {
      const err = validateRegisterField(field as any, value as any)
      setFieldErrors(prev => ({ ...prev, [field]: err }))
    }
  }

  function onBlurField<K extends 'username' | 'email' | 'password'>(field: K, value: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
    const err = validateRegisterField(field as any, value as any)
    setFieldErrors(prev => ({ ...prev, [field]: err }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    setFieldErrors({})

    // Client-side validation (zod)
    const v = validateRegister({ username, email, password })
    if (v.valid === false) {
      setFieldErrors(v.errors)
      const msg = MSG.fixFields
      setError(msg)
      toast.show(msg, 'error')
      return
    }

    setBusy(true)
    try {
      await register(username, email, password)
  toast.show(MSG.accountCreated, 'success')
  nav('/dashboard', { replace: true })
    } catch (err: any) {
      let msg = err?.message || 'Registration failed'
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && Array.isArray(err.details)) {
          const fe: { username?: string; email?: string; password?: string } = {}
          for (const d of err.details as any[]) {
            const f = (d.field || '').toString()
            const m = (d.message || '').toString()
            if (f in fe || ['username','email','password'].includes(f)) {
              // @ts-ignore
              fe[f] = m || 'Invalid value'
            }
          }
          setFieldErrors(fe)
          msg = MSG.fixFields
        }
      }
      setError(msg)
      toast.show(msg, 'error')
    } finally { setBusy(false) }
  }

  return (
    <>
    <section className="auth-page">
      <div className="auth-container" role="region" aria-labelledby="register-title">
        <h1 className="auth-title" id="register-title">Create Account</h1>
        <p className="auth-sub">Please fill in the details to get started</p>
        <form id="register-form" className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="username" className="req">Username</label>
            <input id="username" name="username" autoComplete="username" required placeholder="Create a username"
                   aria-invalid={!!fieldErrors.username} aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                   value={username}
                   onChange={e => setField('username', e.target.value)}
                   onBlur={e => onBlurField('username', e.target.value)} />
            {fieldErrors.username && <div id="username-error" className="error" role="alert">{fieldErrors.username}</div>}
          </div>
          <div className="field">
            <label htmlFor="email" className="req">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="Enter your email"
                   aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                   value={email}
                   onChange={e => setField('email', e.target.value)}
                   onBlur={e => onBlurField('email', e.target.value)} />
            {fieldErrors.email && <div id="email-error" className="error" role="alert">{fieldErrors.email}</div>}
          </div>
          <div className="field">
            <label htmlFor="password" className="req">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required placeholder="Create a password"
                   aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'password-error' : 'password-help'}
                   value={password}
                   onChange={e => setField('password', e.target.value)}
                   onBlur={e => onBlurField('password', e.target.value)} />
            {fieldErrors.password && <div id="password-error" className="error" role="alert">{fieldErrors.password}</div>}
            {!fieldErrors.password && <div id="password-help" className="helper">At least 6 characters</div>}
          </div>
          {error && <div className="error" role="alert">{error}</div>}
          <button type="submit" className="btn-black btn-lg w-100" disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</button>
        </form>
        <p className="text-center mt-3 fs-sm">Already have an account? <Link className="link" to="/login">Sign In</Link></p>
      </div>
    </section>
    <SiteFooter className="fs-sm" />
    </>
  )
}

export default Register
