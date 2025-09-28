import React from 'react'

const About: React.FC = () => {
  return (
    <section className="auth-page" aria-labelledby="about-title">
      <div className="auth-container" role="region">
        <h1 id="about-title" className="auth-title">About Us</h1>
        <p className="auth-sub">Learn more about SNC Rwanda.</p>
        <p className="muted">This is a placeholder page. We can update with your final copy anytime.</p>
      </div>
    </section>
  )
}

export default About
