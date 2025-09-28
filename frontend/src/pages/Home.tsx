import React from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from '../app/BrandLogo'
import { useAuth } from '../lib/auth'

const Home: React.FC = () => {
  const { token } = useAuth()
  return (
    <section className="grid" aria-labelledby="home-title">
      <div className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-content">
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom: 12 }}>
              <BrandLogo size={40} />
            </div>
            <h1 id="home-title" className="hero-title">
              Empowering Every Child,
              <br />
              <span className="em">Embracing Every Ability</span>
            </h1>
            <p className="hero-sub">At our Special Needs Center, we empower children with disabilities (ages 4–15) and their families through personalized support, inclusive education, and therapeutic care.</p>
            {!token && (
              <div className="hero-cta">
                <Link to="/login" className="btn-cta">Login</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Home
