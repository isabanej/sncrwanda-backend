import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeeAPI, studentAPI, guardianAPI, ledgerAPI } from '../services/api';
import './Dashboard.css';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    guardians: 0,
    students: 0,
    employees: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [guardians, students, employees, transactions] = await Promise.all([
        guardianAPI.getAll().catch(() => []),
        studentAPI.getAll().catch(() => []),
        employeeAPI.getAll().catch(() => []),
        ledgerAPI.getAll().catch(() => []),
      ]);

      const income = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions
        .filter(t => t.type === 'EXPENSE' || t.type === 'PAYROLL')
        .reduce((sum, t) => sum + t.amount, 0);

      setStats({
        guardians: guardians.length,
        students: students.filter(s => !s.isDeleted).length,
        employees: employees.filter(e => e.active).length,
        balance: income - expense,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.firstName || user?.username}!</p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Total Guardians</div>
            <div className="stat-value">{loading ? '-' : stats.guardians}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{loading ? '-' : stats.students}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👔</div>
          <div className="stat-content">
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{loading ? '-' : stats.employees}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Account Balance</div>
            <div className="stat-value" style={{ 
              color: stats.balance >= 0 ? '#10b981' : '#ef4444' 
            }}>
              {loading ? '-' : `$${stats.balance.toLocaleString()}`}
            </div>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h2>Quick Actions</h2>
        <div className="activity-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <a href="/guardians" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }}>
                Manage Guardians
              </button>
            </a>
            <a href="/students" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }}>
                Manage Students
              </button>
            </a>
            <a href="/employees" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }}>
                Manage Employees
              </button>
            </a>
            <a href="/ledger" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }}>
                View Ledger
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
