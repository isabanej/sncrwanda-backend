import React from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from '../lib/i18n'

const Privacy: React.FC = () => {
  return (
    <section className="auth-page" aria-labelledby="privacy-title">
      <div className="auth-container" role="region">
        <h1 id="privacy-title" className="auth-title">Privacy Policy</h1>
        <p className="auth-sub">Your privacy matters to us.</p>
  <p className="muted fs-sm" aria-label="updated-on">Updated on: {formatDate(new Date('2025-09-19'))}</p>
        <div className="auth-form">
          <p className="muted">We collect and process personal information to provide and improve our services. We do not sell your personal information. We implement reasonable safeguards to protect your data.</p>
          <h2 className="fs-base mt-2">Information We Collect</h2>
          <ul className="muted" style={{ paddingLeft: '1.2rem' }}>
            <li>Account details such as name and email address.</li>
            <li>Usage information and device data for diagnostics and improvement.</li>
            <li>Cookies or similar technologies for session management.</li>
          </ul>
          <h2 className="fs-base mt-2">How We Use Information</h2>
          <ul className="muted" style={{ paddingLeft: '1.2rem' }}>
            <li>To provide, maintain, and improve our services.</li>
            <li>To communicate with you about your account and service updates.</li>
            <li>To detect, prevent, and address security or technical issues.</li>
          </ul>
          <h2 className="fs-base mt-2">Your Choices</h2>
          <ul className="muted" style={{ paddingLeft: '1.2rem' }}>
            <li>You can request access, correction, or deletion where applicable by law.</li>
            <li>You can adjust cookie or browser settings to manage tracking technologies.</li>
          </ul>
          <div className="row mt-3">
            <Link className="link" to="/terms">View Terms of Use</Link>
            <Link className="link" to="/login">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Privacy
