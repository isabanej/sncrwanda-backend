import type { User } from '../types';

export const canEditOrDelete = (user: User | null): boolean => {
  if (!user) return false;
  
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
};

export const isSuperAdmin = (user: User | null): boolean => {
  if (!user) return false;
  
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.includes('SUPER_ADMIN');
};

export const isAdminOrSuperAdmin = (user: User | null): boolean => {
  return canEditOrDelete(user);
};
