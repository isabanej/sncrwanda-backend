import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MainLayout.css';

export const MainLayout = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/schedule', label: 'Schedule', icon: '📅' },
    { path: '/guardians', label: 'Guardians', icon: '👥' },
    { path: '/students', label: 'Students', icon: '🎓' },
    { path: '/employees', label: 'Employees', icon: '👔' },
    { path: '/ledger/dashboard', label: 'Financial Dashboard', icon: '📈' },
    { path: '/cashflow', label: 'Cashflow', icon: '💵' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    { path: '/admin/users', label: 'User Management', icon: '🔐' },
    { path: '/guardian-portal', label: 'Guardian Portal', icon: '🏠' },
  ];

  // Filter menu items based on user roles
  const visibleMenuItems = menuItems.filter((item) => {
    // User Management only for SUPER_ADMIN
    if (item.path === '/admin/users') {
      return user?.roles?.includes('SUPER_ADMIN') || user?.role === 'SUPER_ADMIN';
    }
    // Guardian Portal only for guardians
    if (item.path === '/guardian-portal') {
      return user?.roles?.includes('GUARDIAN') || user?.role === 'GUARDIAN';
    }
    return true;
  });

  return (
    <div className="layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle menu">
          <span className="hamburger-icon">{isSidebarOpen ? '✕' : '☰'}</span>
        </button>
        <div className="mobile-logo">
          <img src="/logo.jpg" alt="SNC Rwanda" />
        </div>
        <div className="mobile-user">
          {user?.firstName || user?.username}
        </div>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo.jpg" alt="SNC Rwanda" className="logo" />
        </div>
        
        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                isActive ? 'nav-link active' : 'nav-link'
              }
              onClick={closeSidebar}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{user?.firstName || user?.username}</div>
            <div className="user-role">
              {user?.roles?.[0] || user?.role || 'User'}
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
