import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Reports from '../pages/Reports'
import { Providers } from './test-utils'

// Minimal auth context expectations: we rely on AuthProvider using localStorage token; simulate token
beforeEach(() => {
  vi.restoreAllMocks()
  // Provide a token so component attempts authenticated calls
  window.localStorage.setItem('token', 'test-token')
})

describe('Reports create report flow', () => {
  it('opens modal and submits with Create report button label', async () => {
    const today = new Date().toISOString().slice(0,10)
    // Mock fetch sequence: reports list (empty 404), students list, employees list, create POST
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input: any, init: any) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/student-reports')) {
        if (init && init.method === 'POST') {
          // Return created report
            return Promise.resolve(new Response(JSON.stringify({ id: 'r1', studentId: 's1', teacherId: 't1', date: today }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        }
        // initial GET -> empty array
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      if (url.endsWith('/students')) {
        return Promise.resolve(new Response(JSON.stringify([{ id: 's1', childName: 'Student A' }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      if (url.endsWith('/hr/employees')) {
        return Promise.resolve(new Response(JSON.stringify([{ id: 't1', fullName: 'Teacher T', position: 'Teacher' }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })

    render(<Providers><Reports /></Providers>)

    // Open modal
    fireEvent.click(await screen.findByRole('button', { name: /add report/i }))
    // Ensure modal fields present
  const studentSel = await screen.findByLabelText(/student/i)
  // Use exact match for Teacher to avoid matching the hover help icon's aria-label ("Teacher list help")
  const teacherSel = await screen.findByLabelText(/^teacher$/i)
    fireEvent.change(studentSel, { target: { value: 's1' } })
    fireEvent.change(teacherSel, { target: { value: 't1' } })
    const termInput = screen.getByLabelText(/term/i)
    fireEvent.change(termInput, { target: { value: 'Term 1' } })
    // Submit
    const submitBtn = screen.getByRole('button', { name: /create report/i })
    fireEvent.click(submitBtn)
    // Button should change to Creating…
    await screen.findByRole('button', { name: /creating/i })
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /add report/i })).toBeNull()
    })
    // Success toast should appear
    expect(await screen.findByText(/report created/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalled()
  })
})
