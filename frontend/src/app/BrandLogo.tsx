import React, { useState } from 'react'
import fallbackLogo from '../assets/logo.svg'
// Prefer public asset so product can easily swap the file without changing code.
// Place the provided file at: frontend/public/SNC Rwanda Logo.jpg
// Vite will serve it at: /SNC Rwanda Logo.jpg

const BrandLogo: React.FC<{ size?: number }> = ({ size = 32 }) => {
  // Try the provided JPG first, then fall back to the previous placeholder SVG
  const [src, setSrc] = useState<string>('/SNC Rwanda Logo.jpg')
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
      <img
        src={src}
        onError={() => setSrc(fallbackLogo)}
        alt="SNC Rwanda logo"
        width={size}
        height={size}
        style={{ display:'block', borderRadius: 6, objectFit: 'contain' }}
      />
      <strong style={{ fontWeight: 800, letterSpacing: .2, color: '#0d47a1' }}>SNC Rwanda</strong>
    </div>
  )
}

export default BrandLogo
