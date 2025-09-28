import { api } from './api'

export type UUID = string

export interface Branch { id: UUID; name: string }
export interface Department { id: UUID; name: string; branchId?: UUID }

export async function listBranches(): Promise<Branch[]> {
  // Gateway proxies HR under /hr
  return api.get<Branch[]>('/hr/branches')
}

export async function listDepartments(): Promise<Department[]> {
  return api.get<Department[]>('/hr/departments')
}
