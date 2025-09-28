import React, { useState } from 'react'
import { Icon } from './Icon'

/**
 * Reusable hover / focus info tooltip icon.
 * Usage: <HoverInfo text="Helpful hint" />
 * Place inline next to labels or headings.
 */
export interface HoverInfoProps {
  text: string
  ariaLabel?: string
  placement?: 'left' | 'right'
}

export const HoverInfo: React.FC<HoverInfoProps> = ({ text, ariaLabel, placement = 'right' }) => {
  const [open, setOpen] = useState(false)
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <span
        aria-label={ariaLabel || 'Info'}
        role="button"
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help', marginLeft: placement === 'right' ? 4 : 0, marginRight: placement === 'left' ? 4 : 0 }}
      >
        <Icon name="info" size={14 as any} aria-hidden="true" />
      </span>
      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: '100%',
            [placement === 'right' ? 'left' : 'right']: 0,
            marginTop: 4,
            background: '#111',
            color: '#fff',
            fontSize: 12,
            padding: '6px 8px',
            borderRadius: 6,
            boxShadow: '0 6px 16px rgba(0,0,0,.18)',
            whiteSpace: 'nowrap',
            zIndex: 60
          } as React.CSSProperties}
        >
          {text}
        </div>
      )}
    </span>
  )
}

export default HoverInfo
