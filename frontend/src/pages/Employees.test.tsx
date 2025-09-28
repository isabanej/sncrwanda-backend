import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EmployeesPage from './Employees'
import * as employeeApi from '../lib/employeeApi'
import { ToastProvider } from '../lib/toast'

// Mock auth context with admin role so archived toggle appears
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ user: { branchId: '00000000-0000-0000-0000-000000000001', roles: ['ADMIN'] } })
}))

vi.mock('../lib/employeeApi')

const listEmployees = vi.spyOn(employeeApi, 'listEmployees')
const createEmployee = vi.spyOn(employeeApi, 'createEmployee')
const updateEmployee = vi.spyOn(employeeApi, 'updateEmployee')
const archiveEmployee = vi.spyOn(employeeApi, 'archiveEmployee')
const restoreEmployee = vi.spyOn(employeeApi, 'restoreEmployee')

function renderPage() {
  return render(
    <ToastProvider>
      <EmployeesPage />
    </ToastProvider>
  )
}

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listEmployees.mockResolvedValue([])
  })

  it('shows validation summary on empty create submit', async () => {
    renderPage()
    await waitFor(() => expect(listEmployees).toHaveBeenCalled())
    // Open create modal
    fireEvent.click(screen.getByRole('button', { name: /add employee/i }))
    // Submit empty form
    fireEvent.click(await screen.findByRole('button', { name: /save employee/i }))
    // Expect generic summary message
    await screen.findByText(/please fix:/i)
  })

  it('archives then restores an employee (optimistic remove then restore)', async () => {
    // First call (active list)
    listEmployees.mockResolvedValueOnce([
      { id: 'e1', fullName: 'Emp One', position: 'Teacher', salary: 1000, branch: { id: 'b1' }, department: { id: 'd1' } }
    ] as any)
    // Second call (archived list after toggle)
    listEmployees.mockResolvedValueOnce([
      { id: 'e1', fullName: 'Emp One', position: 'Teacher', salary: 1000, branch: { id: 'b1' }, department: { id: 'd1' }, archived: true }
    ] as any)
    renderPage()
    // Row visible
    await screen.findByText('Emp One')
    archiveEmployee.mockResolvedValue(undefined as any)
    // Archive via icon button (aria-label)
    fireEvent.click(screen.getByLabelText(/archive employee/i))
    // Confirm modal: confirm button text 'Archive'
    fireEvent.click(await screen.findByRole('button', { name: /^archive$/i }))
    await waitFor(() => expect(screen.queryByText('Emp One')).toBeNull())

    // Toggle archived view (checkbox)
    const archivedToggle = screen.getByRole('checkbox', { name: /toggle to show archived/i })
    fireEvent.click(archivedToggle)
    // Archived record appears
    await screen.findByText('Emp One')
    restoreEmployee.mockResolvedValue(undefined as any)
    // Restore via icon button
    fireEvent.click(screen.getByLabelText(/restore employee/i))
    // Confirm restore
    fireEvent.click(await screen.findByRole('button', { name: /^restore$/i }))
    await waitFor(() => expect(screen.queryByText('Emp One')).toBeNull())
    expect(archiveEmployee).toHaveBeenCalledTimes(1)
    expect(restoreEmployee).toHaveBeenCalledTimes(1)
  })
})
