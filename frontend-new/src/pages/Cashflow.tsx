import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { cashflow } from '../services/cashflow';
import type { CashflowPeriod, StudentFeePayment, StaffPayroll, CashflowExpense, PettyCashTransaction, ExpenseCategory } from '../services/cashflow';
import { studentAPI, employeeAPI } from '../services/api';
import './Cashflow.css';

export const Cashflow = () => {
  const { user } = useAuth();
  const orgId = '550e8400-e29b-41d4-a716-446655440000'; // Organization ID

  const [periods, setPeriods] = useState<CashflowPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<CashflowPeriod | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [fees, setFees] = useState<StudentFeePayment[]>([]);
  const [payroll, setPayroll] = useState<StaffPayroll[]>([]);
  const [expenses, setExpenses] = useState<CashflowExpense[]>([]);
  const [pettyCash, setPettyCash] = useState<PettyCashTransaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  const [students, setStudents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'fees' | 'payroll' | 'expenses' | 'petty-cash' | 'statement'>('fees');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'fee' | 'payroll' | 'expense' | 'petty-cash' | null>(null);
  const [showImportMessage, setShowImportMessage] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadPeriodData(selectedPeriod.id);
      loadNotification(selectedPeriod.id);
    }
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentPrd, allPeriods, cats, studs, emps] = await Promise.all([
        cashflow.getCurrentPeriod(orgId).catch(() => null),
        cashflow.getAllPeriods(orgId).catch(() => []),
        cashflow.getExpenseCategories().catch(() => []),
        studentAPI.getAll().catch(() => []),
        employeeAPI.getAll().catch(() => []),
      ]);

      setPeriods(allPeriods);
      setSelectedPeriod(currentPrd);
      setCategories(cats);
      setStudents(studs);
      setEmployees(emps);
    } catch (error) {
      console.error('Failed to load cashflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodData = async (periodId: string) => {
    try {
      const [feeData, payrollData, expenseData, pettyCashData] = await Promise.all([
        cashflow.getFeePaymentsForPeriod(periodId).catch(() => []),
        cashflow.getPayrollForPeriod(periodId).catch(() => []),
        cashflow.getExpensesForPeriod(periodId).catch(() => []),
        cashflow.getPettyCashForPeriod(periodId).catch(() => []),
      ]);

      setFees(feeData);
      setPayroll(payrollData);
      setExpenses(expenseData);
      setPettyCash(pettyCashData);
    } catch (error) {
      console.error('Failed to load period data:', error);
    }
  };

  const loadNotification = async (periodId: string) => {
    try {
      const notif = await cashflow.getLateNotification(periodId);
      setNotification(notif);
    } catch (error) {
      setNotification(null);
    }
  };

  const openModal = (type: 'fee' | 'payroll' | 'expense' | 'petty-cash') => {
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
  };

  const handleSubmitFee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await cashflow.recordFeePayment({
        periodId: selectedPeriod!.id,
        studentId: formData.get('studentId') as string,
        studentName: students.find(s => s.id === formData.get('studentId'))?.name || '',
        feeType: formData.get('feeType') as string,
        amountPaid: parseFloat(formData.get('amountPaid') as string),
        paymentDate: formData.get('paymentDate') as string,
        paymentMethod: formData.get('paymentMethod') as string,
        receiptNumber: formData.get('receiptNumber') as string,
        recordedBy: String(user?.id || ''),
      });

      alert('Fee payment recorded successfully!');
      closeModal();
      loadPeriodData(selectedPeriod!.id);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmitPayroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await cashflow.recordPayroll({
        periodId: selectedPeriod!.id,
        employeeId: formData.get('employeeId') as string,
        bonuses: parseFloat(formData.get('bonuses') as string) || 0,
        deductions: parseFloat(formData.get('deductions') as string) || 0,
        paymentMethod: formData.get('paymentMethod') as string,
        paymentDate: formData.get('paymentDate') as string,
        recordedBy: String(user?.id || ''),
      });

      alert('Payroll recorded successfully!');
      closeModal();
      loadPeriodData(selectedPeriod!.id);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await cashflow.recordExpense({
        periodId: selectedPeriod!.id,
        category: formData.get('category') as string,
        amount: parseFloat(formData.get('amount') as string),
        transactionDate: formData.get('transactionDate') as string,
        description: formData.get('description') as string,
        receiptNumber: formData.get('receiptNumber') as string,
        paymentMethod: formData.get('paymentMethod') as string,
        vendorName: formData.get('vendorName') as string,
        recordedBy: String(user?.id || ''),
      });

      alert('Expense recorded successfully!');
      closeModal();
      loadPeriodData(selectedPeriod!.id);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmitPettyCash = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await cashflow.recordPettyCash({
        periodId: selectedPeriod!.id,
        transactionType: formData.get('transactionType') as 'IN' | 'OUT',
        amount: parseFloat(formData.get('amount') as string),
        transactionDate: formData.get('transactionDate') as string,
        category: formData.get('category') as string || undefined,
        description: formData.get('description') as string,
        receiptNumber: formData.get('receiptNumber') as string || undefined,
        handledBy: formData.get('handledBy') as string,
        recordedBy: String(user?.id || ''),
      });

      alert('Petty cash transaction recorded successfully!');
      closeModal();
      loadPeriodData(selectedPeriod!.id);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      OPEN: { class: 'badge-success', text: 'Open' },
      LATE_ENTRY_PERIOD: { class: 'badge-warning', text: 'Late Entry Period' },
      CLOSED: { class: 'badge-secondary', text: 'Closed' },
      LOCKED: { class: 'badge-danger', text: 'Locked' },
    };
    const badge = badges[status as keyof typeof badges] || { class: 'badge-secondary', text: status };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  // Group periods by year
  const periodsByYear = periods.reduce((acc, period) => {
    const year = period.periodName.split(' ')[1]; // Extract year from "Jan 2025"
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(period);
    return acc;
  }, {} as Record<string, CashflowPeriod[]>);

  // Sort years descending
  const sortedYears = Object.keys(periodsByYear).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Monthly Cashflow</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportMessage(true)}
          >
            📊 Import Excel
          </button>
          <select
            className="form-control period-select"
            value={selectedPeriod?.id || ''}
            onChange={(e) => {
              const period = periods.find(p => p.id === e.target.value);
              setSelectedPeriod(period || null);
            }}
          >
            {sortedYears.map(year => (
              <optgroup key={year} label={year}>
                {periodsByYear[year].map(period => (
                  <option key={period.id} value={period.id}>
                    {period.periodName} - {getStatusBadge(period.status).props.children}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {notification && (
        <div className="alert alert-warning">
          <strong>⚠️ {notification}</strong>
        </div>
      )}

      {selectedPeriod && (
        <div className="period-summary">
          <div className="summary-card">
            <div className="summary-label">Period</div>
            <div className="summary-value">{selectedPeriod.periodName}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Status</div>
            <div className="summary-value">{getStatusBadge(selectedPeriod.status)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Beginning Cash</div>
            <div className="summary-value">{formatCurrency(selectedPeriod.beginningCash)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Ending Cash</div>
            <div className="summary-value">{formatCurrency(selectedPeriod.endingCash)}</div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'fees' ? 'active' : ''}`}
          onClick={() => setActiveTab('fees')}
        >
          Student Fees ({fees.length})
        </button>
        <button
          className={`tab ${activeTab === 'payroll' ? 'active' : ''}`}
          onClick={() => setActiveTab('payroll')}
        >
          Payroll ({payroll.length})
        </button>
        <button
          className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses ({expenses.length})
        </button>
        <button
          className={`tab ${activeTab === 'petty-cash' ? 'active' : ''}`}
          onClick={() => setActiveTab('petty-cash')}
        >
          Petty Cash ({pettyCash.length})
        </button>
        <button
          className={`tab ${activeTab === 'statement' ? 'active' : ''}`}
          onClick={() => setActiveTab('statement')}
        >
          Statement
        </button>
      </div>

      <div className="tab-content">
        {/* Student Fees Tab */}
        {activeTab === 'fees' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Student Fee Payments</h2>
              {selectedPeriod?.status !== 'LOCKED' && (
                <button className="btn btn-primary" onClick={() => openModal('fee')}>
                  + Record Fee Payment
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Method</th>
                  <th>Receipt</th>
                  <th>Edits Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.map(fee => (
                  <tr key={fee.id} className={fee.isLateEntry ? 'late-entry' : ''}>
                    <td>{fee.studentName}</td>
                    <td>{fee.feeType}</td>
                    <td>{formatCurrency(fee.amountPaid)}</td>
                    <td>{new Date(fee.paymentDate).toLocaleDateString()}</td>
                    <td>{fee.paymentMethod}</td>
                    <td>{fee.receiptNumber}</td>
                    <td>
                      <span className={`badge ${fee.editAttemptsRemaining === 0 ? 'badge-danger' : 'badge-info'}`}>
                        {fee.editAttemptsRemaining}/3
                      </span>
                    </td>
                    <td>
                      {fee.isLateEntry && <span className="badge badge-warning">Late Entry</span>}
                    </td>
                  </tr>
                ))}
                {fees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center">No fee payments recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Payroll Tab */}
        {activeTab === 'payroll' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Staff Payroll</h2>
              {selectedPeriod?.status !== 'LOCKED' && (
                <button className="btn btn-primary" onClick={() => openModal('payroll')}>
                  + Record Payroll
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Position</th>
                  <th>Base Salary</th>
                  <th>Bonuses</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Edits Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map(pay => (
                  <tr key={pay.id} className={pay.isLateEntry ? 'late-entry' : ''}>
                    <td>{pay.employeeName}</td>
                    <td>{pay.position}</td>
                    <td>{formatCurrency(pay.baseSalary)}</td>
                    <td>{formatCurrency(pay.bonuses)}</td>
                    <td>{formatCurrency(pay.deductions)}</td>
                    <td><strong>{formatCurrency(pay.netSalary)}</strong></td>
                    <td>
                      <span className={`badge ${pay.editAttemptsRemaining === 0 ? 'badge-danger' : 'badge-info'}`}>
                        {pay.editAttemptsRemaining}/3
                      </span>
                    </td>
                    <td>
                      {pay.isLateEntry && <span className="badge badge-warning">Late Entry</span>}
                    </td>
                  </tr>
                ))}
                {payroll.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center">No payroll recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Expenses</h2>
              {selectedPeriod?.status !== 'LOCKED' && (
                <button className="btn btn-primary" onClick={() => openModal('expense')}>
                  + Record Expense
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Receipt</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} className={exp.isLateEntry ? 'late-entry' : ''}>
                    <td>{exp.category}</td>
                    <td>{formatCurrency(exp.amount)}</td>
                    <td>{new Date(exp.transactionDate).toLocaleDateString()}</td>
                    <td>{exp.description}</td>
                    <td>{exp.vendorName}</td>
                    <td>{exp.receiptNumber}</td>
                    <td>
                      {exp.isLateEntry && <span className="badge badge-warning">Late Entry</span>}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center">No expenses recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Petty Cash Tab */}
        {activeTab === 'petty-cash' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Petty Cash Transactions</h2>
              {selectedPeriod?.status !== 'LOCKED' && (
                <button className="btn btn-primary" onClick={() => openModal('petty-cash')}>
                  + Record Transaction
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Handled By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pettyCash.map(pc => (
                  <tr key={pc.id} className={pc.isLateEntry ? 'late-entry' : ''}>
                    <td>
                      <span className={`badge ${pc.transactionType === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                        {pc.transactionType}
                      </span>
                    </td>
                    <td>{formatCurrency(pc.amount)}</td>
                    <td>{new Date(pc.transactionDate).toLocaleDateString()}</td>
                    <td>{pc.category || '-'}</td>
                    <td>{pc.description}</td>
                    <td>{pc.handledBy}</td>
                    <td>
                      {pc.isLateEntry && <span className="badge badge-warning">Late Entry</span>}
                    </td>
                  </tr>
                ))}
                {pettyCash.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center">No petty cash transactions</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Statement Tab */}
        {activeTab === 'statement' && selectedPeriod && (
          <CashflowStatement periodId={selectedPeriod.id} />
        )}
      </div>

      {/* Modals */}
      {showModal && modalType === 'fee' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Fee Payment</h3>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmitFee}>
              <div className="form-group">
                <label>Student *</label>
                <select name="studentId" className="form-control" required>
                  <option value="">Select student...</option>
                  {students.filter(s => !s.isDeleted).map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Fee Type *</label>
                <select name="feeType" className="form-control" required>
                  <option value="">Select type...</option>
                  <option value="Home Schooling">Home Schooling</option>
                  <option value="SNC">SNC</option>
                  <option value="Registration">Registration</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount Paid (RWF) *</label>
                <input type="number" name="amountPaid" className="form-control" required min="0" step="1" />
              </div>
              <div className="form-group">
                <label>Payment Date *</label>
                <input type="date" name="paymentDate" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Payment Method *</label>
                <select name="paymentMethod" className="form-control" required>
                  <option value="">Select method...</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>
              <div className="form-group">
                <label>Receipt Number *</label>
                <input type="text" name="receiptNumber" className="form-control" required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && modalType === 'payroll' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payroll</h3>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmitPayroll}>
              <div className="form-group">
                <label>Employee *</label>
                <select name="employeeId" className="form-control" required>
                  <option value="">Select employee...</option>
                  {employees.filter(e => e.active).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.position}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Bonuses (RWF)</label>
                <input type="number" name="bonuses" className="form-control" min="0" step="1" defaultValue="0" />
              </div>
              <div className="form-group">
                <label>Deductions (RWF)</label>
                <input type="number" name="deductions" className="form-control" min="0" step="1" defaultValue="0" />
              </div>
              <div className="form-group">
                <label>Payment Method *</label>
                <select name="paymentMethod" className="form-control" required>
                  <option value="">Select method...</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>
              <div className="form-group">
                <label>Payment Date *</label>
                <input type="date" name="paymentDate" className="form-control" required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Payroll</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && modalType === 'expense' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Expense</h3>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmitExpense}>
              <div className="form-group">
                <label>Category *</label>
                <select name="category" className="form-control" required>
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.categoryName}>{cat.categoryName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount (RWF) *</label>
                <input type="number" name="amount" className="form-control" required min="0" step="1" />
              </div>
              <div className="form-group">
                <label>Transaction Date *</label>
                <input type="date" name="transactionDate" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input type="text" name="description" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Vendor Name *</label>
                <input type="text" name="vendorName" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Payment Method *</label>
                <select name="paymentMethod" className="form-control" required>
                  <option value="">Select method...</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Check">Check</option>
                </select>
              </div>
              <div className="form-group">
                <label>Receipt Number *</label>
                <input type="text" name="receiptNumber" className="form-control" required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && modalType === 'petty-cash' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Petty Cash Transaction</h3>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmitPettyCash}>
              <div className="form-group">
                <label>Transaction Type *</label>
                <select name="transactionType" className="form-control" required>
                  <option value="">Select type...</option>
                  <option value="IN">Cash IN</option>
                  <option value="OUT">Cash OUT</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount (RWF) *</label>
                <input type="number" name="amount" className="form-control" required min="0" step="1" />
              </div>
              <div className="form-group">
                <label>Transaction Date *</label>
                <input type="date" name="transactionDate" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input type="text" name="category" className="form-control" />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input type="text" name="description" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Receipt Number</label>
                <input type="text" name="receiptNumber" className="form-control" />
              </div>
              <div className="form-group">
                <label>Handled By *</label>
                <input type="text" name="handledBy" className="form-control" required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Excel Message Modal */}
      {showImportMessage && (
        <div className="modal-overlay" onClick={() => setShowImportMessage(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} 
               style={{ 
                 maxWidth: '550px', 
                 borderRadius: '12px',
                 boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
               }}>
            <div className="modal-header" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px 12px 0 0',
              padding: '1.5rem',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  fontSize: '2rem',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '50px',
                  height: '50px'
                }}>
                  📊
                </div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Excel Import Feature</h2>
              </div>
              <button className="close-btn" 
                      onClick={() => setShowImportMessage(false)}
                      style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '2rem' }}>
              <div style={{
                background: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '1rem',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ 
                    fontSize: '1.5rem',
                    marginTop: '0.2rem'
                  }}>ℹ️</div>
                  <p style={{ 
                    margin: 0, 
                    lineHeight: '1.6',
                    color: '#495057',
                    fontSize: '1rem'
                  }}>
                    This feature isn't available right now, but we'll let you know as soon as it's ready to use.
                  </p>
                </div>
              </div>
              
              <div style={{
                background: '#e7f3ff',
                border: '1px solid #b3d9ff',
                borderRadius: '8px',
                padding: '1.25rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '1rem'
                }}>
                  <div style={{ 
                    fontSize: '1.5rem',
                    marginTop: '0.2rem'
                  }}>💬</div>
                  <p style={{ 
                    margin: 0, 
                    lineHeight: '1.6',
                    color: '#004085',
                    fontSize: '0.95rem'
                  }}>
                    If you have any questions or need clarification, please feel free to reach out to the <strong>Administration team</strong> — we're here to help.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ 
              padding: '1rem 2rem 2rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowImportMessage(false)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Cashflow Statement Component
const CashflowStatement = ({ periodId }: { periodId: string }) => {
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatement();
  }, [periodId]);

  const loadStatement = async () => {
    try {
      setLoading(true);
      const data = await cashflow.getCashflowStatement(periodId);
      setStatement(data);
    } catch (error) {
      console.error('Failed to load statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) return <div className="loading">Loading statement...</div>;
  if (!statement) return <div>No statement available</div>;

  return (
    <div className="cashflow-statement">
      <div className="statement-header">
        <h2>Cashflow Statement - {statement.periodName}</h2>
        {statement.formulaValid ? (
          <span className="badge badge-success">✓ Formulas Valid</span>
        ) : (
          <span className="badge badge-danger">✗ Formula Error</span>
        )}
      </div>

      <table className="statement-table">
        <tbody>
          <tr className="section-header">
            <td colSpan={2}><strong>Beginning Balance</strong></td>
          </tr>
          <tr>
            <td>Beginning Cash</td>
            <td className="amount">{formatCurrency(statement.beginningCash)}</td>
          </tr>

          <tr className="section-header">
            <td colSpan={2}><strong>Cash IN</strong></td>
          </tr>
          <tr>
            <td>School Fees</td>
            <td className="amount">{formatCurrency(statement.schoolFeesTotal)}</td>
          </tr>
          <tr>
            <td>Petty Cash IN</td>
            <td className="amount">{formatCurrency(statement.pettyCashIn)}</td>
          </tr>
          <tr>
            <td>Other Cash IN</td>
            <td className="amount">{formatCurrency(statement.otherCashIn)}</td>
          </tr>
          <tr className="total-row">
            <td><strong>Total Cash IN</strong></td>
            <td className="amount"><strong>{formatCurrency(statement.totalCashIn)}</strong></td>
          </tr>

          <tr className="section-header">
            <td colSpan={2}><strong>Cash Available</strong></td>
          </tr>
          <tr className="total-row highlight">
            <td><strong>Cash Available</strong></td>
            <td className="amount"><strong>{formatCurrency(statement.cashAvailable)}</strong></td>
          </tr>

          <tr className="section-header">
            <td colSpan={2}><strong>Cash OUT - Expenses</strong></td>
          </tr>
          {statement.expensesByCategory.map((exp: any) => (
            <tr key={exp.category}>
              <td>{exp.category}</td>
              <td className="amount">{formatCurrency(exp.amount)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td><strong>Total Expenses</strong></td>
            <td className="amount"><strong>{formatCurrency(statement.totalExpenses)}</strong></td>
          </tr>

          <tr className="section-header">
            <td colSpan={2}><strong>Cash OUT - Other</strong></td>
          </tr>
          <tr>
            <td>Payroll</td>
            <td className="amount">{formatCurrency(statement.totalPayroll)}</td>
          </tr>
          <tr>
            <td>Petty Cash OUT</td>
            <td className="amount">{formatCurrency(statement.pettyCashOut)}</td>
          </tr>
          <tr className="total-row">
            <td><strong>Total Cash OUT</strong></td>
            <td className="amount"><strong>{formatCurrency(statement.totalCashOut)}</strong></td>
          </tr>

          <tr className="section-header">
            <td colSpan={2}><strong>Ending Balance</strong></td>
          </tr>
          <tr className="ending-row">
            <td><strong>Ending Cash</strong></td>
            <td className="amount"><strong>{formatCurrency(statement.endingCash)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
