import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import Students from './Students'
import { Providers } from '../test/test-utils'

function mockFetchSequence(responses: any[]) {
  // @ts-ignore
  global.fetch = vi.fn()
  responses.forEach(r => (global.fetch as any).mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => r,
    text: async () => JSON.stringify(r)
  }))
}

describe('Guardian live search', () => {
  it('updates results when deleting characters', async () => {
    const students: any[] = []
    const guardians = [
      { id: 'g1', fullName: 'Janvier Alpha', phone: '078' },
      { id: 'g2', fullName: 'Jane Bravo', phone: '078' }
    ]
    // Calls: list students, list guardians (initial), subsequent guardian searches (we reuse same data)
    mockFetchSequence([students, guardians, guardians, guardians])

    render(<Providers><Students /></Providers>)

    await waitFor(() => expect(screen.getByText('Students')).toBeInTheDocument())

    // Open create form (button text may be 'Add student' or similar)
    const addBtn = screen.getByRole('button', { name: /add/i })
    fireEvent.click(addBtn)

    const guardianInput = screen.getByLabelText('Guardian')
    fireEvent.change(guardianInput, { target: { value: 'janvier' } })
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())
    // Now delete characters -> 'janvi'
    fireEvent.change(guardianInput, { target: { value: 'janvi' } })
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())
    // Should still contain Janvier Alpha
    expect(screen.getByText(/Janvier Alpha/i)).toBeInTheDocument()
  })
})
