import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { DatePicker } from './DatePicker'

function setup(initial = '') {
  let value = initial
  const onChange = (v: string) => { value = v }
  render(<DatePicker id="dob" name="dob" value={value} onChange={onChange} keepOpenUntilSelect />)
  return { getValue: () => value }
}

describe('DatePicker keepOpenUntilSelect', () => {
  it('keeps calendar open after typing full valid date until day click', () => {
    const { getValue } = setup('')
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    // calendar opens
    expect(screen.getByRole('dialog', { name: /choose date/i })).toBeInTheDocument()
    // type a valid date in range (simulate direct typing)
    fireEvent.change(input, { target: { value: '2020-05-10' } })
    // Because keepOpenUntilSelect=true, dialog should still be present
    expect(screen.getByRole('dialog', { name: /choose date/i })).toBeInTheDocument()
    // Click a day button (10) to select
    const dayBtn = screen.getAllByRole('gridcell').find(b => b.textContent === '10') as HTMLElement
    fireEvent.click(dayBtn)
    // After selection, dialog closes
    expect(screen.queryByRole('dialog', { name: /choose date/i })).toBeNull()
    expect(getValue()).toBeDefined()
  })
})
