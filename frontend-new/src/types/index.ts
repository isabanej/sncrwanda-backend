// User types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  roles?: UserRole[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN';

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Student types
export interface Student {
  id: string;
  guardianId: string;
  childFirstName: string;
  childLastName: string;
  childDob: string;
  gender?: 'MALE' | 'FEMALE';
  hobbies?: string;
  needs?: string[];
  needsOtherText?: string;
  branchId?: string;
  deleted?: boolean;  // Backend returns 'deleted' not 'isDeleted'
  isDeleted?: boolean; // Keep for backwards compatibility
}

export interface StudentRequest {
  guardianId: string;
  childFirstName: string;
  childLastName: string;
  childDob: string;
  gender?: 'MALE' | 'FEMALE';
  hobbies?: string;
  needs?: string[];
  needsOtherText?: string;
  branchId?: string;
}

// Guardian types
export interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender?: 'MALE' | 'FEMALE';
  email?: string;
  address?: string;
  orgId: string;
  deleted?: boolean;  // Backend returns 'deleted' not 'isDeleted'
  isDeleted?: boolean; // Keep for backwards compatibility
}

// Employee types
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender?: 'MALE' | 'FEMALE';
  address: string;
  position: string;
  salary: number;
  phone?: string;
  email?: string;
  active: boolean;
  orgId: string;
  deleted?: boolean;  // Backend returns 'deleted' not 'isDeleted'
  isDeleted?: boolean; // Keep for backwards compatibility
}

// Ledger types
export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'PAYROLL';
  category: string;
  name?: string;
  materials?: string[];
  amount: number;
  txDate: string;
  notes?: string;
  orgId: string;
}

// Schedule types
export interface ScheduleEntry {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  teacherId?: number;
  classId?: number;
}
