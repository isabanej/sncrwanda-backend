import React from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import BrandLogo from './BrandLogo'
import { buildPublicNavLinks } from './navLinks'

const App: React.FC = () => {
  const { token, user, logout } = useAuth()
  const nav = useNavigate()
  const navItems = buildPublicNavLinks({ roles: user?.roles, username: user?.username, onLogout: logout })
  return (
    <div className="app">
      {token && (
      <header className="topbar topbar-light" role="banner">
        <div className="container topbar-inner">
          <Link to="/" className="brand-link" aria-label="Home">
            <BrandLogo />
          </Link>
          <nav className="nav-centered" aria-label="Primary">
            {navItems.map((item, idx) => (
              item.to ? (
                <NavLink key={item.to} to={item.to} end>
                  {item.label}
                </NavLink>
              ) : (
                <a key={`action-${idx}`} href="#" onClick={(e) => { e.preventDefault(); item.onClick && item.onClick(); nav('/login', { replace: true }) }}>{item.label}</a>
              )
            ))}
          </nav>
        </div>
      </header>
      )}
      <main id="main" className="container" role="main">
        <Outlet />
      </main>
      <footer className="footer container" role="contentinfo">
        <small>© 2025 SNCRwanda</small>
      </footer>
    </div>
  )
}

export default App
