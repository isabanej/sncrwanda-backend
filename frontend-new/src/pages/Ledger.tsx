import { useState, useEffect } from 'react';
import { ledgerAPI } from '../services/api';
import type { Transaction } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';
import '../pages/Dashboard.css';

export const Ledger = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE' | 'PAYROLL',
    category: '',
    name: '',
    amount: '',
    txDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const data = await ledgerAPI.getAll();
      // Reverse the array to show newest entries first
      setTransactions(data.reverse());
    } catch (err: any) {
      // Only show error if it's a real API failure, not just empty data
      const errorMessage = err?.response?.status === 404 
        ? '' 
        : 'Unable to connect to the server. Please check your connection and try again.';
      setError(errorMessage);
      console.error('Load error:', err);
      setTransactions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ledgerAPI.create({
        type: formData.type,
        category: formData.category,
        name: formData.name || undefined,
        amount: parseFloat(formData.amount),
        txDate: formData.txDate,
        notes: formData.notes || undefined,
      });
      await loadTransactions();
      setShowForm(false);
      setFormData({
        type: 'INCOME',
        category: '',
        name: '',
        amount: '',
        txDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (err) {
      setError('Failed to create transaction');
      console.error('Create error:', err);
    }
  };

  const calculateTotals = () => {
    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter(t => t.type === 'EXPENSE' || t.type === 'PAYROLL')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  };

  const totals = calculateTotals();

  if (loading) {
    return <div className="page-container"><p>Loading...</p></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Ledger</h1>
        <p>Financial records and transactions</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <div className="stat-label">Total Income</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              ${totals.income.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💸</div>
          <div className="stat-content">
            <div className="stat-label">Total Expenses</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>
              ${totals.expense.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Balance</div>
            <div className="stat-value" style={{ color: totals.balance >= 0 ? '#10b981' : '#ef4444' }}>
              ${totals.balance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>All Transactions ({transactions.length})</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Transaction'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Type *</label>
                <SearchableSelect
                  options={[
                    { value: 'INCOME', label: 'Income' },
                    { value: 'EXPENSE', label: 'Expense' },
                    { value: 'PAYROLL', label: 'Payroll' }
                  ]}
                  value={formData.type}
                  onChange={(value) => setFormData({ ...formData, type: value as any })}
                  placeholder="Select transaction type"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Tuition, Supplies, Salaries"
                  required
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Transaction name"
                />
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.txDate}
                  onChange={(e) => setFormData({ ...formData, txDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ marginTop: '1rem' }}>
              Create Transaction
            </button>
          </form>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Name</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  No transactions found. Click "Add Transaction" to create one.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.txDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      tx.type === 'INCOME' ? 'badge-success' : 
                      tx.type === 'PAYROLL' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>{tx.category}</td>
                  <td>{tx.name || '-'}</td>
                  <td className="font-semibold" style={{ 
                    color: tx.type === 'INCOME' ? '#10b981' : '#ef4444' 
                  }}>
                    {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString()}
                  </td>
                  <td>{tx.notes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
