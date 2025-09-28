import { render, screen, waitFor } from '@testing-library/react'
import Students from './Students'
import { Providers } from '../test/test-utils'

function mockFetchOnce(data: any, init: Partial<Response> = {}) {
  // @ts-ignore
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: init.status ?? 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data)
  })
}

describe('Students page', () => {
  it('renders students list', async () => {
    const students = [{ id: 's1', childName: 'Alice' }]
    const guardians = [{ id: 'g1', fullName: 'Jane Doe', phone: '078...' }]
    // first call: /students, second: /students/guardians
    // @ts-ignore
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => students, text: async () => JSON.stringify(students) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => guardians, text: async () => JSON.stringify(guardians) })

    render(<Providers><Students /></Providers>)

    await waitFor(() => expect(screen.getByText('Students')).toBeInTheDocument())
    expect(await screen.findByText('Alice')).toBeInTheDocument()
  })
})

