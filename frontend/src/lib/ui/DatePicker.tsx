import React, { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  // If true, do not auto-close when user types a valid date; only close when a day button is clicked or Escape pressed.
  keepOpenUntilSelect?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function parseISODate(s?: string | null): Date | null {
  if (!s) return null
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(s)
  if (!m) return null
  const [y, mo, d] = s.split('-').map(n => Number(n))
  const dt = new Date(Date.UTC(y, mo-1, d))
  if (isNaN(dt.getTime())) return null
  // Return local date (ignore tz for display)
  return new Date(y, mo-1, d)
}

// Monday-first header labels to match cheatsheet look (Mon-Sun)
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export const DatePicker: React.FC<Props> = ({ id, name, value, onChange, onBlur, placeholder = 'YYYY-MM-DD', required, keepOpenUntilSelect = false, ...aria }) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const selected = useMemo(() => parseISODate(value), [value])
  const today = useMemo(() => new Date(), [])
  // Date range: [minDate, maxDate]
  const maxDate = useMemo(() => new Date(today.getFullYear() - 4, today.getMonth(), today.getDate()), [today])
  const minDate = useMemo(() => new Date(today.getFullYear() - 15, today.getMonth(), today.getDate()), [today])
  const [open, setOpen] = useState(false)
  // Default view to cutoff month if no selection, to reduce back-clicks
  const [view, setView] = useState<Date>(() => selected || new Date(maxDate.getFullYear(), maxDate.getMonth(), 1))
  // Keyboard navigation cursor (focused day)
  const [cursor, setCursor] = useState<Date>(() => selected ? new Date(selected) : new Date(maxDate))

  useEffect(() => { if (selected) { setView(new Date(selected.getFullYear(), selected.getMonth(), 1)); setCursor(new Date(selected)) } }, [selected])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(e.target as Node)) return
      // Only close on outside click if not forced to stay open until selection
      if (!keepOpenUntilSelect) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, keepOpenUntilSelect])

  // If the user types a complete, valid date within range, close the popover immediately
  useEffect(() => {
    if (!open) return
    const dt = parseISODate(value)
    if (!dt) return
    const inRange = dt >= minDate && dt <= maxDate
    if (inRange) {
      setView(new Date(dt.getFullYear(), dt.getMonth(), 1))
      setCursor(new Date(dt))
      if (!keepOpenUntilSelect) setOpen(false)
    }
  }, [value, open, minDate, maxDate, keepOpenUntilSelect])

  // Ensure cursor stays within range
  function clampDate(d: Date) {
    if (d < minDate) return new Date(minDate)
    if (d > maxDate) return new Date(maxDate)
    return d
  }

  // Focus the button representing the cursor when open/cursor/view changes
  useEffect(() => {
    if (!open) return
    const id = `dpd-${cursor.getFullYear()}-${pad(cursor.getMonth()+1)}-${pad(cursor.getDate())}`
    const el = popRef.current?.querySelector<HTMLButtonElement>(`#${id}`)
    if (el) el.focus()
  }, [open, cursor, view])

  const startOfMonth = new Date(view.getFullYear(), view.getMonth(), 1)
  // Convert JS weekday (Sun=0..Sat=6) to Monday-first index (Mon=0..Sun=6)
  const startDayMon = (startOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const totalCells = startDayMon + daysInMonth
  const weeks = Math.ceil(totalCells / 7) // 4-6
  const gridStart = new Date(view.getFullYear(), view.getMonth(), 1 - startDayMon)
  const days: { date: Date; inMonth: boolean; isSelected: boolean; isToday: boolean }[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    const inMonth = d.getMonth() === view.getMonth()
    const isSelected = !!selected && d.getFullYear()===selected.getFullYear() && d.getMonth()===selected.getMonth() && d.getDate()===selected.getDate()
    const isToday = d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate()
    days.push({ date: d, inMonth, isSelected, isToday })
  }
  function pick(d: Date) {
    const iso = toISODate(d)
    onChange(iso)
    setOpen(false)
    // Trigger validation if parent provided
    if (onBlur && inputRef.current) onBlur({
      ...({} as any),
      target: inputRef.current
    } as React.FocusEvent<HTMLInputElement>)
  }

    

  function prevMonth() { setView(v => {
    const prev = new Date(v.getFullYear(), v.getMonth()-1, 1)
    if (prev < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) return v
    return prev
  }) }
  function nextMonth() { setView(v => {
    const next = new Date(v.getFullYear(), v.getMonth()+1, 1)
    // Disallow navigating to months whose first day is after maxDate (i.e., entirely beyond allowed range)
    if (next > maxDate) return v
    return next
  }) }

    function moveCursorDays(delta: number) {
      const nd = clampDate(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + delta))
      setCursor(nd)
      const firstOfNew = new Date(nd.getFullYear(), nd.getMonth(), 1)
      const firstOfView = new Date(view.getFullYear(), view.getMonth(), 1)
      if (firstOfNew.getTime() !== firstOfView.getTime()) {
        setView(firstOfNew)
      }
    }

    function moveCursorMonths(delta: number) {
      const nd = clampDate(new Date(cursor.getFullYear(), cursor.getMonth() + delta, cursor.getDate()))
      setCursor(nd)
      const firstOfNew = new Date(nd.getFullYear(), nd.getMonth(), 1)
      setView(firstOfNew)
    }

    function goToViewMonthEdge(which: 'start'|'end') {
      const first = new Date(view.getFullYear(), view.getMonth(), 1)
      const last = new Date(view.getFullYear(), view.getMonth()+1, 0)
      const target = which === 'start' ? first : last
      const clamped = clampDate(target)
      setCursor(clamped)
    }

  return (
    <div className="date-group" ref={wrapperRef}>
      <input
        id={id}
        name={name}
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
  onFocus={() => setOpen(true)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        aria-haspopup="dialog"
        aria-expanded={open}
        {...aria}
      />
      {open && (
          <div
            className="calendar-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Choose date"
            ref={popRef}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                setOpen(false)
                inputRef.current?.focus()
                return
              }
              if (e.key === 'Tab') {
                // Simple focus trap within popover
                const focusables = popRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])')
                if (!focusables || focusables.length === 0) return
                const first = focusables[0]
                const last = focusables[focusables.length - 1]
                const active = document.activeElement as HTMLElement | null
                if (e.shiftKey) {
                  if (active === first || !popRef.current?.contains(active)) { e.preventDefault(); last.focus() }
                } else {
                  if (active === last || !popRef.current?.contains(active)) { e.preventDefault(); first.focus() }
                }
              }
            }}
          >
          {/* Live region to announce month/year changes for assistive tech */}
          <div style={{ position:'absolute', left:'-9999px', width:1, height:1, overflow:'hidden' }} aria-live="polite">
            {new Date(view.getFullYear(), view.getMonth(), 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </div>
          <div className="cal-header">
            {(() => {
              const prevFirst = new Date(view.getFullYear(), view.getMonth()-1, 1)
              const prevDisabled = prevFirst < new Date(minDate.getFullYear(), minDate.getMonth(), 1)
              return (
                <button type="button" className="cal-nav" onClick={() => { if (!prevDisabled) prevMonth() }} aria-label="Previous month" disabled={prevDisabled} aria-disabled={prevDisabled}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )
            })()}
            <div className="cal-title">
              <select className="cal-select" value={view.getMonth()} onChange={(e) => {
                const m = Number(e.target.value)
                let y = view.getFullYear()
                // Clamp to bounds when month selection pushes out of range
                const first = new Date(y, m, 1)
                if (first < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) { y = minDate.getFullYear() }
                if (first > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)) { y = maxDate.getFullYear() }
                const newView = new Date(y, m, 1)
                if (newView < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) return
                if (newView > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)) return
                setView(newView)
              }} aria-label="Select month">
                {Array.from({ length: 12 }, (_, i) => (
                  <option value={i} key={i}>{new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })}</option>
                ))}
              </select>
              <select className="cal-select" value={view.getFullYear()} onChange={(e) => {
                const y = Number(e.target.value)
                const newView = new Date(y, view.getMonth(), 1)
                if (newView < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) return
                if (newView > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)) return
                setView(newView)
              }} aria-label="Select year">
                {(() => {
                  const years: number[] = []
                  for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) years.push(y)
                  return years.map(y => <option key={y} value={y}>{y}</option>)
                })()}
              </select>
            </div>
            {(() => {
              const nextFirst = new Date(view.getFullYear(), view.getMonth()+1, 1)
              const nextDisabled = nextFirst > maxDate
              return (
                <button type="button" className="cal-nav" onClick={() => { if (!nextDisabled) nextMonth() }} aria-label="Next month" disabled={nextDisabled} aria-disabled={nextDisabled}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )
            })()}
          </div>
            <div className="cal-weekdays">
            {WEEKDAYS.map(d => <div key={d} className="cal-wd">{d}</div>)}
          </div>
            {/* small decorative bar under header for cheatsheet style */}
            <div className="cal-sep" aria-hidden="true" />
            <div className="cal-grid" role="grid" aria-label="Calendar">
            {days.map(({ date: d, inMonth, isSelected, isToday }, idx) => {
              const disabled = d > maxDate || d < minDate
              const isWeekend = d.getDay() === 0 || d.getDay() === 6 // Sun or Sat
              return (
              <button
                key={idx}
                  id={`dpd-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
                type="button"
                className={
                  'cal-day' +
                  (inMonth ? '' : ' cal-out') +
                  (isSelected ? ' cal-sel' : '') +
                  (isToday ? ' cal-today' : '') +
                  (disabled ? ' cal-disabled' : '') +
                  (isWeekend ? ' cal-weekend' : '')
                }
                onMouseDown={e => e.preventDefault()}
                onClick={() => { if (!disabled) pick(d) }}
                aria-disabled={disabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !disabled) { e.preventDefault(); pick(d); return }
                    switch (e.key) {
                      case 'ArrowLeft': e.preventDefault(); moveCursorDays(-1); break
                      case 'ArrowRight': e.preventDefault(); moveCursorDays(1); break
                      case 'ArrowUp': e.preventDefault(); moveCursorDays(-7); break
                      case 'ArrowDown': e.preventDefault(); moveCursorDays(7); break
                      case 'PageUp': e.preventDefault(); moveCursorMonths(-1); break
                      case 'PageDown': e.preventDefault(); moveCursorMonths(1); break
                      case 'Home': e.preventDefault(); goToViewMonthEdge('start'); break
                      case 'End': e.preventDefault(); goToViewMonthEdge('end'); break
                      default:
                    }
                  }}
                role="gridcell"
                  tabIndex={(!disabled && d.getFullYear()===cursor.getFullYear() && d.getMonth()===cursor.getMonth() && d.getDate()===cursor.getDate()) ? 0 : -1}
              >
                {d.getDate()}
              </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
