export type NavItem = {
  label: string
  to?: string
  onClick?: () => void
  requiresRole?: string[]
}

const hasAnyRole = (roles: string[] | undefined, required?: string[]) => {
  if (!required || required.length === 0) return true
  if (!roles || roles.length === 0) return false
  return roles.some(r => required.includes(r))
}

export function buildPublicNavLinks(args: { roles?: string[]; username?: string; onLogout: () => void }): NavItem[] {
  let { roles, username, onLogout } = args
  // Fallback: treat 'emino' username as SUPER_ADMIN if not already present
  if (username && username.toLowerCase() === 'emino') {
    const set = new Set(roles || [])
    set.add('SUPER_ADMIN')
    roles = Array.from(set)
  }
  const items: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard' },
    // Teaching/Administration
    { label: 'Schedule', to: '/schedule', requiresRole: ['ADMIN', 'TEACHER', 'SUPER_ADMIN'] },
    { label: 'Guardians', to: '/guardians', requiresRole: ['ADMIN', 'TEACHER', 'SUPER_ADMIN'] },
    { label: 'Students', to: '/students', requiresRole: ['ADMIN', 'TEACHER', 'SUPER_ADMIN'] },
    // Administration only
    { label: 'Employees', to: '/employees', requiresRole: ['ADMIN', 'SUPER_ADMIN'] },
    { label: 'Ledger', to: '/ledger', requiresRole: ['ADMIN', 'SUPER_ADMIN'] },
    { label: 'User management', to: '/admin/users', requiresRole: ['ADMIN', 'SUPER_ADMIN'] },
    // Guardian specific (optional)
    { label: 'Guardian portal', to: '/guardian', requiresRole: ['GUARDIAN', 'ADMIN', 'SUPER_ADMIN'] },
    // Logout
    { label: 'Logout', onClick: onLogout }
  ]
  // Filter by role visibility
  return items.filter(i => hasAnyRole(roles, i.requiresRole))
}
