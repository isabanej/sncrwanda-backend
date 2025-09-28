import React from 'react'
import { Link } from 'react-router-dom'

const SiteFooter: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <footer className={className ?? ''} style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: 12 }}>
      <Link className="link" to="/terms">Terms</Link>
      <span> · </span>
      <Link className="link" to="/privacy">Privacy</Link>
    </footer>
  )
}

export default SiteFooter
