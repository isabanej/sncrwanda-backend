import api from './api';

const cashflowAPI = {
  get: (url: string, config?: any) => api.get(`/ledger/api/cashflow${url}`, config),
  post: (url: string, data?: any, config?: any) => api.post(`/ledger/api/cashflow${url}`, data, config),
  put: (url: string, data?: any, config?: any) => api.put(`/ledger/api/cashflow${url}`, data, config),
  delete: (url: string, config?: any) => api.delete(`/ledger/api/cashflow${url}`, config),
};

// Types
export interface CashflowPeriod {
  id: string;
  orgId: string;
  year: number;
  month: number;
  periodName: string;
  beginningCash: number;
  endingCash: number;
  status: 'OPEN' | 'LATE_ENTRY_PERIOD' | 'LOCKED';
  lockedDate?: string;
  lateEntryDeadline: string;
  createdAt: string;
  lastUpdated: string;
}

export interface StudentFeePayment {
  id: string;
  periodId: string;
  studentId: string;
  studentName: string;
  feeType: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  editCount: number;
  editAttemptsRemaining: number;
  isLateEntry: boolean;
  recordedAt: string;
  recordedBy: string;
}

export interface StaffPayroll {
  id: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  position: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  paymentMethod: string;
  paymentDate: string;
  editCount: number;
  editAttemptsRemaining: number;
  isLateEntry: boolean;
}

export interface CashflowExpense {
  id: string;
  periodId: string;
  category: string;
  amount: number;
  transactionDate: string;
  description: string;
  receiptNumber: string;
  paymentMethod: string;
  vendorName: string;
  isLateEntry: boolean;
}

export interface PettyCashTransaction {
  id: string;
  periodId: string;
  transactionType: 'IN' | 'OUT';
  amount: number;
  transactionDate: string;
  category?: string;
  description: string;
  receiptNumber?: string;
  handledBy: string;
  isLateEntry: boolean;
}

export interface ExpenseCategory {
  id: string;
  categoryName: string;
  isSystemDefined: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface CashflowStatement {
  periodId: string;
  periodName: string;
  year: number;
  month: number;
  status: string;
  beginningCash: number;
  schoolFeesTotal: number;
  otherCashIn: number;
  pettyCashIn: number;
  totalCashIn: number;
  cashAvailable: number;
  expensesByCategory: { category: string; amount: number }[];
  totalExpenses: number;
  totalPayroll: number;
  pettyCashOut: number;
  totalCashOut: number;
  endingCash: number;
  formulaValid: boolean;
}

// Cashflow API
export const cashflow = {
  // Periods
  getCurrentPeriod: async (orgId: string): Promise<CashflowPeriod> => {
    const response = await cashflowAPI.get(`/periods/current?orgId=${orgId}`);
    return response.data;
  },

  getAllPeriods: async (orgId: string): Promise<CashflowPeriod[]> => {
    const response = await cashflowAPI.get(`/periods?orgId=${orgId}`);
    return response.data;
  },

  getPeriod: async (periodId: string): Promise<CashflowPeriod> => {
    const response = await cashflowAPI.get(`/periods/${periodId}`);
    return response.data;
  },

  createPeriod: async (orgId: string, year: number, month: number): Promise<CashflowPeriod> => {
    const response = await cashflowAPI.post(`/periods?orgId=${orgId}&year=${year}&month=${month}`);
    return response.data;
  },

  lockPeriod: async (periodId: string, userId: string): Promise<void> => {
    await cashflowAPI.post(`/periods/${periodId}/lock?userId=${userId}`);
  },

  getLateNotification: async (periodId: string): Promise<string> => {
    const response = await cashflowAPI.get(`/periods/${periodId}/notification`);
    return response.data;
  },

  // Student Fees
  recordFeePayment: async (data: {
    periodId: string;
    studentId: string;
    studentName: string;
    feeType: string;
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
    receiptNumber: string;
    recordedBy: string;
  }): Promise<StudentFeePayment> => {
    const response = await cashflowAPI.post('/fees', data);
    return response.data;
  },

  updateFeePayment: async (paymentId: string, data: {
    newAmount: number;
    newPaymentDate: string;
    newPaymentMethod: string;
    newReceiptNumber: string;
    updatedBy: string;
  }): Promise<StudentFeePayment> => {
    const response = await cashflowAPI.put(`/fees/${paymentId}`, data);
    return response.data;
  },

  getFeePaymentsForPeriod: async (periodId: string): Promise<StudentFeePayment[]> => {
    const response = await cashflowAPI.get(`/fees/period/${periodId}`);
    return response.data;
  },

  // Payroll
  recordPayroll: async (data: {
    periodId: string;
    employeeId: string;
    bonuses: number;
    deductions: number;
    paymentMethod: string;
    paymentDate: string;
    recordedBy: string;
  }): Promise<StaffPayroll> => {
    const response = await cashflowAPI.post('/payroll', data);
    return response.data;
  },

  updatePayroll: async (payrollId: string, data: {
    newBonuses: number;
    newDeductions: number;
    newPaymentMethod: string;
    newPaymentDate: string;
    updatedBy: string;
  }): Promise<StaffPayroll> => {
    const response = await cashflowAPI.put(`/payroll/${payrollId}`, data);
    return response.data;
  },

  getPayrollForPeriod: async (periodId: string): Promise<StaffPayroll[]> => {
    const response = await cashflowAPI.get(`/payroll/period/${periodId}`);
    return response.data;
  },

  // Expenses
  recordExpense: async (data: {
    periodId: string;
    category: string;
    amount: number;
    transactionDate: string;
    description: string;
    receiptNumber: string;
    paymentMethod: string;
    vendorName: string;
    recordedBy: string;
  }): Promise<CashflowExpense> => {
    const response = await cashflowAPI.post('/expenses', data);
    return response.data;
  },

  updateExpense: async (expenseId: string, data: {
    category: string;
    amount: number;
    transactionDate: string;
    description: string;
    receiptNumber: string;
    paymentMethod: string;
    vendorName: string;
    updatedBy: string;
  }): Promise<CashflowExpense> => {
    const response = await cashflowAPI.put(`/expenses/${expenseId}`, data);
    return response.data;
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    await cashflowAPI.delete(`/expenses/${expenseId}`);
  },

  getExpensesForPeriod: async (periodId: string): Promise<CashflowExpense[]> => {
    const response = await cashflowAPI.get(`/expenses/period/${periodId}`);
    return response.data;
  },

  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    const response = await cashflowAPI.get('/expenses/categories');
    return response.data;
  },

  // Petty Cash
  recordPettyCash: async (data: {
    periodId: string;
    transactionType: 'IN' | 'OUT';
    amount: number;
    transactionDate: string;
    category?: string;
    description: string;
    receiptNumber?: string;
    handledBy: string;
    recordedBy: string;
  }): Promise<PettyCashTransaction> => {
    const response = await cashflowAPI.post('/petty-cash/transactions', data);
    return response.data;
  },

  getPettyCashForPeriod: async (periodId: string): Promise<PettyCashTransaction[]> => {
    const response = await cashflowAPI.get(`/petty-cash/transactions/period/${periodId}`);
    return response.data;
  },

  getPettyCashBalance: async (periodId: string): Promise<number> => {
    const response = await cashflowAPI.get(`/petty-cash/balance/period/${periodId}`);
    return response.data;
  },

  // Reports
  getCashflowStatement: async (periodId: string): Promise<CashflowStatement> => {
    const response = await cashflowAPI.get(`/reports/statement/${periodId}`);
    return response.data;
  },

  getCashflowSummary: async (orgId: string): Promise<any> => {
    const response = await cashflowAPI.get(`/reports/summary?orgId=${orgId}`);
    return response.data;
  },

  getPeriods: async (): Promise<CashflowPeriod[]> => {
    // Get org ID from somewhere - for now use default
    const orgId = '550e8400-e29b-41d4-a716-446655440000';
    try {
      // Try the with-totals endpoint first
      const response = await cashflowAPI.get(`/periods/with-totals?orgId=${orgId}`);
      return response.data;
    } catch (error) {
      // Fall back to regular periods endpoint if with-totals fails
      console.warn('Failed to get periods with totals, falling back to regular periods:', error);
      const response = await cashflowAPI.get(`/periods?orgId=${orgId}`);
      // Add default zero totals
      return response.data.map((p: any) => ({
        ...p,
        totalIncome: 0,
        totalExpenses: 0,
        totalFees: 0,
      }));
    }
  },

  validateFormulas: async (periodId: string): Promise<any> => {
    const response = await cashflowAPI.get(`/reports/validate/${periodId}`);
    return response.data;
  },

  // Excel Import
  importExcel: async (formData: FormData): Promise<any> => {
    const response = await cashflowAPI.post('/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  validateExcel: async (formData: FormData): Promise<any> => {
    const response = await cashflowAPI.post('/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default cashflow;
