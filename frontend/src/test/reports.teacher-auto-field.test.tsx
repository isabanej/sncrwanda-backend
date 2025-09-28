import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Reports from '../pages/Reports'
import { Providers } from './test-utils'

// Mock auth for teacher (non-admin) role, teacherId auto-lock expected
vi.mock('../lib/auth', async (orig) => {
  const actual: any = await orig()
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'teacher-1', roles: ['TEACHER'], branchId: 'b1' },
      token: 'test-token',
      logout: () => {},
    })
  }
})

function mockFetch() {
  const today = new Date().toISOString().slice(0,10)
  vi.spyOn(globalThis, 'fetch').mockImplementation((input: any, init: any) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = (init?.method || 'GET').toUpperCase()
    const json = (data: any, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }))

    if (method === 'GET' && /\/student-reports(?!.*restore)/.test(url)) return json([])
    if (method === 'GET' && url.endsWith('/students')) return json([{ id: 's1', childName: 'Student A' }])
    if (method === 'GET' && url.endsWith('/hr/employees')) return json([{ id: 'teacher-1', fullName: 'Teach One', position: 'Teacher' }])

    if (method === 'POST' && url.endsWith('/student-reports')) {
      const body = JSON.parse(init?.body || '{}')
      // Expect teacherId auto-populated and immutable
      if (body.teacherId !== 'teacher-1') return json({ message: 'teacherId mismatch' }, 400)
      return json({ id: 'r1', ...body, date: body.date || today }, 201)
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  })
}

describe('Reports teacher auto teacherId', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.setItem('token', 'test-token')
    mockFetch()
  })

  it('locks teacher field and auto sets teacherId on create', async () => {
    render(<Providers><Reports /></Providers>)
    await screen.findByText(/student reports/i)

    fireEvent.click(screen.getByRole('button', { name: /add report/i }))
    const modal = await screen.findByTestId('report-edit-modal')
    // Teacher input is read-only with value of logged in teacher
    const teacherInput = await screen.findByDisplayValue('teacher-1')
    expect(teacherInput).toHaveAttribute('readonly')

    // Fill minimal required fields
    fireEvent.change(modal.querySelector('#rp-student') as HTMLSelectElement, { target: { value: 's1' } })
    fireEvent.change(modal.querySelector('#rp-term') as HTMLInputElement, { target: { value: 'T1' } })
    fireEvent.click(screen.getByRole('button', { name: /create report/i }))

    // New row appears (after creation, list prepends)
    await screen.findByText('Teach One')
  })
})
