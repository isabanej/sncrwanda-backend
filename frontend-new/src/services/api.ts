import axios from 'axios';
import type { 
  LoginCredentials, 
  AuthResponse, 
  User, 
  UserResponse, 
  UserRole,
  Employee,
  Student,
  StudentRequest,
  Guardian,
  Transaction
} from '../types';

const API_BASE_URL = 'http://localhost:9090';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized) - clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// User Management API
export const userAPI = {
  getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await api.get('/auth/admin/users');
    return response.data;
  },

  getUserById: async (id: number): Promise<UserResponse> => {
    const response = await api.get(`/auth/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id: number, data: { roles: UserRole[] }): Promise<UserResponse> => {
    const response = await api.put(`/auth/admin/users/${id}`, data);
    return response.data;
  },

  toggleUserActive: async (id: number, active: boolean): Promise<UserResponse> => {
    const response = await api.put(`/auth/admin/users/${id}/activate?active=${active}`);
    return response.data;
  },

  getAllRoles: async (): Promise<UserRole[]> => {
    const response = await api.get('/auth/admin/roles');
    return response.data;
  },
};

// Employee API
export const employeeAPI = {
  getAll: async (): Promise<Employee[]> => {
    const response = await api.get('/hr/employees');
    return response.data;
  },

  create: async (employee: Omit<Employee, 'id' | 'isDeleted'>): Promise<Employee> => {
    const response = await api.post('/hr/employees', employee);
    return response.data;
  },
  
  update: async (id: string, employee: Partial<Employee>): Promise<Employee> => {
    const response = await api.put(`/hr/employees/${id}`, employee);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/hr/employees/${id}`);
  },
  
  restore: async (id: string): Promise<void> => {
    await api.put(`/hr/employees/${id}/restore`);
  },
};

// Guardian API
export const guardianAPI = {
  getAll: async (): Promise<Guardian[]> => {
    const response = await api.get('/students/guardians');
    return response.data;
  },

  create: async (guardian: Omit<Guardian, 'id' | 'orgId' | 'isDeleted'>): Promise<Guardian> => {
    const response = await api.post('/students/guardians', guardian);
    return response.data;
  },
  
  update: async (id: string, guardian: Partial<Guardian>): Promise<Guardian> => {
    const response = await api.put(`/students/guardians/${id}`, guardian);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/students/guardians/${id}`);
  },
  
  restore: async (id: string): Promise<void> => {
    await api.put(`/students/guardians/${id}/restore`);
  },
};

// Student API
export const studentAPI = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get('/students');
    return response.data;
  },

  getById: async (id: string): Promise<Student> => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  create: async (student: StudentRequest): Promise<Student> => {
    const response = await api.post('/students', student);
    return response.data;
  },

  update: async (id: string, student: StudentRequest): Promise<Student> => {
    const response = await api.put(`/students/${id}`, student);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },
  
  restore: async (id: string): Promise<void> => {
    await api.put(`/students/${id}/restore`);
  },
};

// Ledger API
export const ledgerAPI = {
  getAll: async (): Promise<Transaction[]> => {
    const response = await api.get('/ledger/transactions');
    return response.data;
  },

  create: async (transaction: Omit<Transaction, 'id' | 'orgId'>): Promise<Transaction> => {
    const response = await api.post('/ledger/transactions', transaction);
    return response.data;
  },
};

export default api;
