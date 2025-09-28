import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Reports from '../pages/Reports'
import { Providers } from './test-utils'

// Mock auth to force admin role so archived toggle renders
vi.mock('../lib/auth', async (orig) => {
  const actual: any = await orig()
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'u1', roles: ['ADMIN'], branchId: 'b1' },
      token: 'test-token',
      logout: () => {},
    })
  }
})

// This test covers archiving a report then restoring it (admin toggle visible)

describe('Reports archive / restore flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.setItem('token', 'test-token')
  })

  function mockFetchSequence() {
    // Order of calls (approx):
    // 1: GET /student-reports (active)
  // 2: GET /students
  // 3: GET /hr/teachers (new) OR fallback /hr/employees
    // Archive: DELETE /student-reports/:id
    // Reload active list (GET /student-reports)
    // Toggle archived → GET /student-reports?archived=true
    // Restore: POST /student-reports/:id/restore
    // Reload active after restore

    const today = new Date().toISOString().slice(0,10)
    const activeReport = { id: 'r1', studentId: 's1', teacherId: 't1', date: today, term: 'T1' }

    let archiveCalled = false
    let restoreCalled = false
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input: any, init: any) => {
      const url = typeof input === 'string' ? input : input.toString()
      const method = (init?.method || 'GET').toUpperCase()
      const json = (data: any, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }))

      if (method === 'GET' && /\/student-reports(?!.*restore)/.test(url)) {
        const archivedView = url.includes('archived=true')
        if (archivedView) {
          // Show record only after archive called
          return json(archiveCalled ? [activeReport] : [])
        }
        // Active view logic
        if (!archiveCalled) return json([activeReport])
        if (archiveCalled && !restoreCalled) return json([])
        if (restoreCalled) return json([activeReport])
      }
  if (method === 'GET' && url.endsWith('/students')) return json([{ id: 's1', childName: 'Student A' }])
  if (method === 'GET' && url.endsWith('/hr/teachers')) return json([{ id: 't1', fullName: 'Teacher T', position: 'Teacher' }])
  if (method === 'GET' && url.endsWith('/hr/employees')) return json([{ id: 't1', fullName: 'Teacher T', position: 'Teacher' }])

      if (method === 'DELETE' && url.match(/\/student-reports\/r1$/)) { archiveCalled = true; return json({}, 200) }
      if (method === 'POST' && url.match(/\/student-reports\/r1\/restore$/)) { restoreCalled = true; return json(activeReport, 200) }

      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })
    return fetchMock
  }

  it('archives and restores a report using admin archived toggle', async () => {
  mockFetchSequence()
  // Enable debug instrumentation
  // @ts-ignore
  ;(globalThis as any).__REPORTS_DEBUG__ = true
  const user = userEvent.setup()

    render(<Providers><Reports /></Providers>)

  // Wait for load to complete (loading marker gone) and row present
  await screen.findByText(/student reports/i)
  await screen.findByText('Student A')
  await waitFor(()=> expect(screen.queryByTestId('reports-loading')).toBeNull())

    // Archive action (opens confirm modal)
    const archiveBtn = await screen.findByTestId('archive-btn-r1')
    fireEvent.click(archiveBtn)
    try {
      await screen.findByTestId('confirm-archive-state', {}, { timeout: 800 })
    } catch (e) {
      // Dump debug logs if modal not found
      // @ts-ignore
      // eslint-disable-next-line no-console
      console.error('REPORTS_DEBUG_LOG', (globalThis as any).__REPORTS_LOG__)
      throw e
    }
    const confirmArchive = await screen.findByTestId('confirm-archive')
    fireEvent.click(confirmArchive)

    // Row removed (active list now empty)
    await waitFor(() => expect(screen.queryByText('Student A')).toBeNull(), { timeout: 3000 })

    // Toggle to archived view
    const archivedToggle = screen.getByRole('checkbox', { name: /showing active reports/i })
    await user.click(archivedToggle)

    // Row appears again (restore)
    await screen.findByText('Student A')
    fireEvent.click(screen.getByLabelText(/restore report/i))
    await screen.findByTestId('report-confirm-modal')
    const confirmRestore = await screen.findByTestId('confirm-restore')
    fireEvent.click(confirmRestore)

    // Back to active list
    await user.click(archivedToggle)
    await screen.findByText('Student A')
  })
})
