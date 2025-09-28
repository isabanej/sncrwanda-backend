import { describe, it, expect } from 'vitest'
import { validateRegister } from '../lib/validation'

describe('Register password validation', () => {
  it('accepts password of length 6', () => {
    const res = validateRegister({ username: 'user123', email: 'u@example.com', password: '123456' })
    expect(res).toEqual({ valid: true })
  })
  it('rejects password shorter than 6', () => {
    const res = validateRegister({ username: 'user123', email: 'u@example.com', password: '12345' })
    expect(res.valid).toBe(false)
  })
})
