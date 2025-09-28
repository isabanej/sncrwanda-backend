import React from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from '../lib/i18n'

const Terms: React.FC = () => {
  return (
    <section className="auth-page" aria-labelledby="terms-title">
      <div className="auth-container" role="region">
        <h1 id="terms-title" className="auth-title">Terms of Use</h1>
        <p className="auth-sub">Please read these terms carefully.</p>
  <p className="muted fs-sm" aria-label="updated-on">Updated on: {formatDate(new Date('2025-09-19'))}</p>
        <div className="auth-form">
          <p className="muted">These Terms of Use govern your access to and use of this application. By using the app, you agree to comply with these terms. If you do not agree, please do not use the app.</p>
          <h2 className="fs-base mt-2">Acceptable Use</h2>
          <ul className="muted" style={{ paddingLeft: '1.2rem' }}>
            <li>Use the service responsibly and in compliance with applicable laws.</li>
            <li>Do not share your credentials or attempt unauthorized access.</li>
            <li>Do not disrupt or degrade service performance for others.</li>
          </ul>
          <h2 className="fs-base mt-2">Account & Security</h2>
          <ul className="muted" style={{ paddingLeft: '1.2rem' }}>
            <li>You are responsible for maintaining the confidentiality of your account.</li>
            <li>Notify us promptly of any unauthorized use of your account.</li>
          </ul>
          <h2 className="fs-base mt-2">Changes to These Terms</h2>
          <p className="muted">We may update these terms from time to time. Your continued use after changes become effective constitutes acceptance of the revised terms.</p>
          <div className="row mt-3">
            <Link className="link" to="/privacy">View Privacy Policy</Link>
            <Link className="link" to="/login">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Terms
