import { render, screen, waitFor } from '@testing-library/react'
import Reports from './Reports'
import { Providers } from '../test/test-utils'

function mockResponse(data: any) {
  return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => data, text: async () => JSON.stringify(data) }
}

describe('Reports page', () => {
  it('renders form and table', async () => {
    const reports = [{ id: 'r1', studentId: 's1', term: '2025-Q1', date: '2025-09-19' }]
    const students = [{ id: 's1', childName: 'Alice' }]
    const teachers = [{ id: 't1', fullName: 'Mr. Smith' }]
    // @ts-ignore
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(reports))    // /student-reports
      .mockResolvedValueOnce(mockResponse(students))   // /students
      .mockResolvedValueOnce(mockResponse(teachers))   // /hr/employees

    render(<Providers><Reports /></Providers>)

    await waitFor(() => expect(screen.getByText('Student Reports')).toBeInTheDocument())
    // Basic table presence
    expect(screen.getByRole('table', { name: /reports table/i })).toBeInTheDocument()
  })
})

