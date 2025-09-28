import { api } from './api'

export type UUID = string

export interface EmployeePayload {
  fullName: string
  dob: string
  address: string
  position: string
  salary: number
  startDate?: string
  endDate?: string
  phone?: string
  email?: string
  bankName?: string
  bankAccount?: string
  department: { id: UUID }
  branch: { id: UUID }
  active?: boolean
}

export interface Employee extends EmployeePayload {
  id: UUID
  isDeleted?: boolean
  deletedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export async function listEmployees(opts: { archived?: boolean } = {}): Promise<Employee[]> {
  const q = opts.archived ? '?archived=true' : ''
  return api.get(`/hr/employees${q}`)
}

export async function getEmployee(id: UUID): Promise<Employee> {
  return api.get(`/hr/employees/${id}`)
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  return api.post('/hr/employees', payload)
}

export async function updateEmployee(id: UUID, payload: EmployeePayload): Promise<Employee> {
  return api.put(`/hr/employees/${id}`, payload)
}

export async function archiveEmployee(id: UUID): Promise<void> {
  await api.delete(`/hr/employees/${id}`)
}

export async function restoreEmployee(id: UUID): Promise<void> {
  await api.post(`/hr/employees/${id}/restore`, {})
}
