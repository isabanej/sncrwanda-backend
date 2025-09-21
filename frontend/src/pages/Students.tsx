import React, { useEffect, useMemo, useRef, useState } from 'react'
import { DatePicker } from '../lib/ui/DatePicker'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useNavigate } from 'react-router-dom'
import { validateStudent, validateStudentField } from '../lib/validation'
import { MSG } from '../lib/messages'

type UUID = string

type Student = {
  id: UUID
  guardianId: UUID
  childName: string
  childDob: string
  hobbies?: string
  needs?: string[]
  needsOtherText?: string | null
  branchId?: UUID | null
}

type Guardian = {
  id: UUID
  fullName: string
  phone: string
  email?: string
  address?: string
  branchId?: UUID
}

const pageSizeDefault = 10

const Students: React.FC = () => {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [students, setStudents] = useState<Student[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  // No inline error banner; we use toasts for feedback
  const [busy, setBusy] = useState(false)

  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(pageSizeDefault)
  const [guardianInput, setGuardianInput] = useState('')
  const [guardianOpen, setGuardianOpen] = useState(false)
  const [guardiansBusy, setGuardiansBusy] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  // Hobbies popover state
  const [hobbyOpen, setHobbyOpen] = useState(false)
  const [hobbyQuery, setHobbyQuery] = useState('')
  const [hobbyActive, setHobbyActive] = useState(-1)
  const hobbyInputRef = useRef<HTMLInputElement | null>(null)
  const hobbyPopoverRef = useRef<HTMLDivElement | null>(null)
  const hobbyToggleRef = useRef<HTMLButtonElement | null>(null)
  const [popularHobbies, setPopularHobbies] = useState<string[]>([])

  const [editingId, setEditingId] = useState<UUID | null>(null)
  const [form, setForm] = useState({
    guardianId: '' as UUID | '',
    childName: '',
    childDob: '',
    hobbies: '',
    needsOtherText: '',
    needs: [] as string[]
  })
  const [fieldErrors, setFieldErrors] = useState<{ guardianId?: string; childName?: string; childDob?: string; hobbies?: string; needsOtherText?: string; needs?: string }>({})
  const [touched, setTouched] = useState<{ guardianId?: boolean; childName?: boolean; childDob?: boolean; hobbies?: boolean; needsOtherText?: boolean; needs?: boolean }>({})

  const branchId = useMemo(() => user?.branchId, [user])

  // Needs options per provided list
  const NEED_OPTIONS = useMemo(() => [
    'Physical',
    'Hearing',
    'Social/ Communication (Autism)',
    'Mental/ Emotional health',
    'Health conditional (e.g Epilepsy)',
    'Mobility',
    'Visual',
    'Speech/ Language',
    'Learning',
    'Other'
  ], [])

  useEffect(() => {
    let on = true
    async function load() {
      try {
        const studs = await api.get<Student[]>('/students', token).catch((e: any) => {
          if (e instanceof ApiError && e.status === 404) return [] as Student[]
          throw e
        })
        // Try gateway first; fall back to direct student service in dev if needed
        let guards = await api.get<Guardian[]>('/students/guardians', token).catch(async (e: any) => {
          if (e instanceof ApiError) {
            if (e.status === 404) return [] as Guardian[]
            if ([0, 502, 503, 504].includes(e.status)) {
              try {
                return await api.get<Guardian[]>('/_student/students/guardians', token)
              } catch { return [] as Guardian[] }
            }
          }
          try {
            return await api.get<Guardian[]>('/_student/students/guardians', token)
          } catch { return [] as Guardian[] }
        })
        if (on) { setStudents(studs); setGuardians(guards) }
      } catch (e: any) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          toast.show('Your session expired. Please login again.', 'error')
          logout(); navigate('/login', { replace: true }); return
        }
  // Show toast only; no inline error space
  toast.show(e?.message || 'Failed to load students', 'error')
      }
    }
    load()
    return () => { on = false }
  }, [token, logout, navigate, toast])

  // Ensure guardian input reflects the selected guardian once guardians are available (e.g., when editing)
  useEffect(() => {
    if (form.guardianId) {
      const g = guardians.find(x => x.id === form.guardianId)
      if (g && guardianInput !== g.fullName) {
        setGuardianInput(g.fullName)
      }
    }
  }, [guardians, form.guardianId])

  // Debounced guardian search by name; suppress errors and 404
  useEffect(() => {
    let on = true
    const q = guardianInput.trim()
    const handle = setTimeout(async () => {
      setGuardiansBusy(true)
      try {
        const url = q ? `/students/guardians?q=${encodeURIComponent(q)}` : '/students/guardians'
        const fallbackUrl = q ? `/_student/students/guardians?q=${encodeURIComponent(q)}` : '/_student/students/guardians'
        let list = await api.get<Guardian[]>(url, token).catch(async (e: any) => {
          if (e instanceof ApiError) {
            if (e.status === 404) return [] as Guardian[]
            if ([0, 502, 503, 504].includes(e.status)) {
              try { return await api.get<Guardian[]>(fallbackUrl, token) } catch { return [] as Guardian[] }
            }
          }
          try { return await api.get<Guardian[]>(fallbackUrl, token) } catch { return [] as Guardian[] }
        })
  if (on) { setGuardians(list); setActiveIndex(list.length ? 0 : -1) }
      } finally { setGuardiansBusy(false) }
    }, 300)
    return () => { on = false; clearTimeout(handle) }
  }, [guardianInput, token])

  // Handlers for the single guardian combobox
  function onGuardianInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setGuardianInput(val)
    setGuardianOpen(true)
    setActiveIndex(-1)
    // typing invalidates any previously selected guardian
    setForm(f => ({ ...f, guardianId: '' }))
  }
  function onGuardianSelect(g: Guardian) {
    setForm(f => ({ ...f, guardianId: g.id }))
    setGuardianInput(g.fullName)
    setGuardianOpen(false)
    setTouched(prev => ({ ...prev, guardianId: true }))
    setFieldErrors(prev => ({ ...prev, guardianId: undefined }))
  }
  function onGuardianBlur() {
    setGuardianOpen(false)
    setTouched(prev => ({ ...prev, guardianId: true }))
    setFieldErrors(prev => ({ ...prev, guardianId: form.guardianId ? undefined : 'Please select a guardian' }))
  }

  function onGuardianKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = guardians.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setGuardianOpen(true)
      if (n > 0) setActiveIndex(i => (i + 1) % n)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setGuardianOpen(true)
      if (n > 0) setActiveIndex(i => (i <= 0 ? n - 1 : i - 1))
      return
    }
    if (e.key === 'Enter') {
      if (guardianOpen && activeIndex >= 0 && activeIndex < n) {
        e.preventDefault()
        onGuardianSelect(guardians[activeIndex])
      }
      return
    }
    if (e.key === 'Escape') {
      setGuardianOpen(false)
      return
    }
  }

  // Narrow onChange to fields that are simple text/select controls (exclude 'needs' which is handled via checkboxes)
  type SimpleFormKeys = 'guardianId' | 'childName' | 'childDob' | 'hobbies' | 'needsOtherText'
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as { name: SimpleFormKeys; value: string }
    setForm(f => ({ ...f, [name]: value }))
    if (touched[name]) {
      const err = validateStudentField(name as any, value as any)
      setFieldErrors(prev => ({ ...prev, [name]: err }))
    }
    if (name === 'needsOtherText') {
      const text = value?.trim() || ''
      const hasAtLeastOne = (form.needs && form.needs.length > 0) || text.length > 0
      setTouched(prev => ({ ...prev, needs: true }))
      setFieldErrors(prev => ({ ...prev, needs: hasAtLeastOne ? undefined : 'Please select at least one need (or specify Other).' }))
    }
  }

  function onBlurField<K extends keyof typeof form>(field: K, value: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
    const err = validateStudentField(field as any, value as any)
    setFieldErrors(prev => ({ ...prev, [field]: err }))
  }

  function resetForm() {
    setEditingId(null)
    setForm({ guardianId: '', childName: '', childDob: '', hobbies: '', needsOtherText: '', needs: [] })
    setGuardianInput('')
    setFieldErrors({})
    setTouched({})
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validateStudent(form)
    if (v.valid === false) {
      setFieldErrors(v.errors)
      toast.show(MSG.fixFields, 'error')
      return
    }
    setBusy(true)
    try {
      const payload = {
        guardianId: form.guardianId,
        childName: form.childName.trim(),
        childDob: form.childDob,
        hobbies: form.hobbies.trim() || undefined,
        needs: form.needs && form.needs.length ? form.needs : undefined,
        needsOtherText: form.needsOtherText?.trim() || undefined,
        branchId
      }
      if (editingId) {
        const updated = await api.put<Student>(`/students/${editingId}`, payload, token)
        setStudents(s => s.map(x => x.id === editingId ? updated : x))
        toast.show(MSG.studentUpdated, 'success')
      } else {
        const created = await api.post<Student>('/students', payload, token)
        setStudents(s => [created, ...s])
        toast.show(MSG.studentCreated, 'success')
      }
      resetForm()
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        toast.show(MSG.sessionExpired, 'error')
        logout(); navigate('/login', { replace: true }); return
      }
  const msg = e?.message || (editingId ? 'Failed to update student' : 'Failed to register student')
  toast.show(msg, 'error')
    } finally { setBusy(false) }
  }

  async function onDelete(id: UUID) {
    if (!confirm('Delete this student?')) return
    try {
      await api.delete<void>(`/students/${id}`, token)
      setStudents(s => s.filter(x => x.id !== id))
      toast.show(MSG.studentDeleted, 'success')
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        toast.show(MSG.sessionExpired, 'error')
        logout(); navigate('/login', { replace: true }); return
      }
  toast.show(e?.message || 'Failed to delete student', 'error')
    }
  }

  function onEdit(s: Student) {
    setEditingId(s.id)
    setForm({
      guardianId: s.guardianId,
      childName: s.childName,
      childDob: s.childDob,
      hobbies: s.hobbies || '',
      needsOtherText: s.needsOtherText || '',
      needs: s.needs || []
    })
    const g = guardians.find(x => x.id === s.guardianId)
    setGuardianInput(g?.fullName || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // --- Hobbies helpers ---
  function parseHobbies(text: string | undefined | null): string[] {
    if (!text) return []
    return text
      .split(/\r?\n|,/)
      .map(t => t.trim())
      .filter(Boolean)
  }

  const existingHobbies = useMemo(() => {
    const set = new Set<string>()
    students.forEach(s => parseHobbies(s.hobbies).forEach(h => set.add(h)))
    // Include current form content as well
    parseHobbies(form.hobbies).forEach(h => set.add(h))
    // Include server-suggested popular hobbies
    popularHobbies.forEach(h => set.add(h))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [students, form.hobbies, popularHobbies])

  const filteredHobbySuggestions = useMemo(() => {
    const q = hobbyQuery.trim().toLowerCase()
    const current = new Set(parseHobbies(form.hobbies).map(h => h.toLowerCase()))
    const list = q
      ? existingHobbies.filter(h => h.toLowerCase().includes(q))
      : existingHobbies.slice()
    return list.filter(h => !current.has(h.toLowerCase())).slice(0, 8)
  }, [existingHobbies, hobbyQuery, form.hobbies])

  function addHobby(h: string) {
    const val = (h || '').trim()
    if (!val) return
    const current = parseHobbies(form.hobbies)
    const has = current.some(x => x.toLowerCase() === val.toLowerCase())
    if (has) { setHobbyOpen(false); setHobbyQuery(''); setHobbyActive(-1); return }
    const next = current.length ? [...current, val] : [val]
    setForm(f => ({ ...f, hobbies: next.join('\n') }))
    setHobbyOpen(false); setHobbyQuery(''); setHobbyActive(-1)
  }

  function removeHobby(h: string) {
    const list = parseHobbies(form.hobbies)
    const next = list.filter(x => x.toLowerCase() !== h.toLowerCase())
    setForm(f => ({ ...f, hobbies: next.join('\n') }))
  }

  // --- Popular hobbies: fetch and persist top N ---
  useEffect(() => {
    let on = true
    async function loadPopular() {
      try {
        const list = await api.get<string[]>('/students/hobbies/popular', token)
        if (on && Array.isArray(list)) setPopularHobbies(list)
      } catch {
        // fallback to localStorage
        try {
          const raw = localStorage.getItem('popularHobbies')
          if (raw && on) setPopularHobbies(JSON.parse(raw))
        } catch {}
      }
    }
    loadPopular()
    return () => { on = false }
  }, [token])

  function computeTopNHobbiesFromStudents(N: number): string[] {
    const counts = new Map<string, number>()
    const addOne = (x: string) => counts.set(x, (counts.get(x) || 0) + 1)
    students.forEach(s => parseHobbies(s.hobbies).forEach(addOne))
    parseHobbies(form.hobbies).forEach(addOne)
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, N)
      .map(([h]) => h)
  }

  async function persistPopularHobbies() {
    const top = computeTopNHobbiesFromStudents(10)
    try {
      await api.post<void>('/students/hobbies/popular', { hobbies: top }, token)
    } catch {
      try { localStorage.setItem('popularHobbies', JSON.stringify(top)) } catch {}
    }
  }

  // After adding a hobby, try persisting popular
  useEffect(() => {
    if (!hobbyOpen) {
      // debounce a bit
      const t = setTimeout(() => { persistPopularHobbies() }, 500)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.hobbies])

  // Close hobby popover on outside click
  useEffect(() => {
    if (!hobbyOpen) return
    function onDocDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      const inPopover = hobbyPopoverRef.current?.contains(target)
      const inToggle = hobbyToggleRef.current?.contains(target)
      if (!inPopover && !inToggle) setHobbyOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [hobbyOpen])

  function toggleNeed(opt: string) {
    setForm(f => {
      const has = f.needs.includes(opt)
      const next = has ? f.needs.filter(x => x !== opt) : [...f.needs, opt]
      // If Other was unchecked, clear its text
      const nextOtherText = (opt === 'Other' && !next.includes('Other')) ? '' : f.needsOtherText
      const hasAtLeastOne = next.length > 0 || (!!nextOtherText && nextOtherText.trim().length > 0)
      setTouched(prev => ({ ...prev, needs: true }))
      setFieldErrors(prev => ({ ...prev, needs: hasAtLeastOne ? undefined : 'Please select at least one need (or specify Other).' }))
      return { ...f, needs: next, needsOtherText: nextOtherText }
    })
  }

  const allSelected = useMemo(() => NEED_OPTIONS.every(o => form.needs.includes(o)), [NEED_OPTIONS, form.needs])
  function selectAllNeeds() { setForm(f => ({ ...f, needs: [...NEED_OPTIONS] })) }
  function clearAllNeeds() { setForm(f => ({ ...f, needs: [], needsOtherText: '' })) }

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const list = f ? students.filter(s => s.childName.toLowerCase().includes(f)) : students.slice()
    return list
  }, [students, filter])

  const paged = useMemo(() => {
    const start = page * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => { setPage(0) }, [filter, pageSize])

  return (
    <section className="grid">
      <div className="form-card" role="region" aria-labelledby="student-form-title">
        <div className="form-card-head">
          <div className="chev" aria-hidden>‹</div>
          <h2 id="student-form-title">{editingId ? 'Edit student' : 'Register student'}</h2>
        </div>
        <div className="form-card-divider" />
        <form id="student-form" className="form-modern" onSubmit={onSubmit} noValidate aria-label="Student form">
          <div className="form-2col">
            {/* Left column stack: Guardian, DOB, Hobbies */}
            <div className="field-stack">
              <div className="field" style={{ position: 'relative' }}>
                <label htmlFor="guardian" className="req">Guardian</label>
                <input
                  id="guardian"
                  aria-label="Guardian"
                  placeholder="Search and select a guardian"
                  autoComplete="off"
                  value={guardianInput}
                  onChange={onGuardianInputChange}
                  onFocus={() => setGuardianOpen(true)}
                  onBlur={onGuardianBlur}
                  onKeyDown={onGuardianKeyDown}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={guardianOpen}
                  aria-controls="guardian-listbox"
                  aria-activedescendant={guardianOpen && activeIndex>=0 && guardians[activeIndex] ? `guardian-opt-${guardians[activeIndex].id}` : undefined}
                  aria-invalid={!!fieldErrors.guardianId}
                  aria-describedby={fieldErrors.guardianId ? 'student-guardianId-error' : undefined}
                />
                {guardiansBusy && !guardianOpen && (
                  <div className="helper" aria-live="polite" style={{ marginTop: 4 }}>Searching…</div>
                )}
                {guardianOpen && (
                  <div className="dropdown-panel">
                    {guardiansBusy && <div className="helper" style={{ padding:8 }}>Searching…</div>}
                    {!guardiansBusy && guardians.length === 0 && guardianInput.trim() && (
                      <div className="helper" style={{ padding:8 }}>No matches</div>
                    )}
                    {!guardiansBusy && guardians.length > 0 && (
                      <ul className="combo-list" role="listbox" id="guardian-listbox">
                        {guardians.map((g, idx) => (
                          <li key={g.id}>
                            <button
                              id={`guardian-opt-${g.id}`}
                              role="option"
                              aria-selected={idx === activeIndex}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); onGuardianSelect(g) }}
                              onMouseEnter={() => setActiveIndex(idx)}
                              className={`combo-item${idx===activeIndex ? ' active' : ''}`}
                              title={g.fullName}
                            >
                              {g.fullName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {fieldErrors.guardianId && <div id="student-guardianId-error" className="error" role="alert">{fieldErrors.guardianId}</div>}
              </div>
              {/* Moved Child name here under Guardian */}
              <div className="field">
                <label htmlFor="childName" className="req">Child name</label>
                <input id="childName" name="childName" required value={form.childName} onChange={onChange}
                       onBlur={e => onBlurField('childName', e.target.value)} placeholder="Enter child name"
                       aria-invalid={!!fieldErrors.childName} aria-describedby={fieldErrors.childName ? 'student-childName-error' : undefined} />
                {fieldErrors.childName && <div id="student-childName-error" className="error" role="alert">{fieldErrors.childName}</div>}
              </div>
              <div className="field">
                <label htmlFor="childDob" className="req">Child date of birth
                  <span className="helper" title="Allowed: ages 4–15 (no future dates)" style={{ marginLeft: '6px', display: 'inline-flex', verticalAlign: 'middle' }}>
                    <svg className="icon-info" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <line x1="12" y1="10" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="7" r="1.5" fill="currentColor" />
                    </svg>
                  </span>
                </label>
                <DatePicker
                  id="childDob"
                  name="childDob"
                  value={form.childDob}
                  onChange={(v) => onChange({ target: { name: 'childDob', value: v } } as any)}
                  onBlur={e => onBlurField('childDob', (e.target as HTMLInputElement).value)}
                  required
                  aria-invalid={!!fieldErrors.childDob}
                  aria-describedby={fieldErrors.childDob ? 'student-childDob-error' : undefined}
                />
                {fieldErrors.childDob && <div id="student-childDob-error" className="error" role="alert">{fieldErrors.childDob}</div>}
              </div>
              <div className="field" style={{ position: 'relative' }}>
                <div className="hobby-toolbar" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <label htmlFor="hobbies">Hobbies</label>
                  <button
                    type="button"
                    ref={hobbyToggleRef}
                    className="btn btn-secondary btn-sm"
                    aria-haspopup="dialog"
                    aria-expanded={hobbyOpen}
                    onClick={() => {
                      setHobbyOpen(o => !o)
                      setHobbyQuery('')
                      setHobbyActive(-1)
                      setTimeout(() => hobbyInputRef.current?.focus(), 0)
                    }}
                  >
                    Add
                  </button>
                </div>

                {/* Chips representation of hobbies */}
                {parseHobbies(form.hobbies).length > 0 && (
                  <div className="chips" role="list">
                    {parseHobbies(form.hobbies).map(h => (
                      <span role="listitem" key={h} className="chip">
                        {h}
                        <button type="button" className="chip-x" aria-label={`Remove ${h}`} onClick={() => removeHobby(h)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Keep textarea hidden as the backing store */}
                <textarea id="hobbies" name="hobbies" value={form.hobbies} onChange={onChange}
                          onBlur={e => onBlurField('hobbies', e.target.value)} placeholder="Optional"
                          aria-invalid={!!fieldErrors.hobbies} aria-describedby={fieldErrors.hobbies ? 'student-hobbies-error' : undefined}
                          style={{ display: 'none' }} />

                {hobbyOpen && (
                  <div ref={hobbyPopoverRef} className="dropdown-panel hobby-popover" role="dialog" aria-label="Add hobby">
                    <div className="popover-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>
                      <strong style={{ fontSize: '.9rem', color: 'var(--title)' }}>Add hobby</strong>
                      <button type="button" className="chip-x" aria-label="Close" onClick={() => setHobbyOpen(false)}>×</button>
                    </div>
                    <div style={{ padding: 8, display: 'grid', gap: 6 }}>
                      <input
                        ref={hobbyInputRef}
                        aria-label="New hobby"
                        placeholder="Type or choose…"
                        value={hobbyQuery}
                        onChange={e => { setHobbyQuery(e.target.value); setHobbyActive(-1) }}
                        onKeyDown={e => {
                          const n = filteredHobbySuggestions.length
                          if (e.key === 'ArrowDown' && n > 0) { e.preventDefault(); setHobbyActive(i => (i + 1) % n); return }
                          if (e.key === 'ArrowUp' && n > 0) { e.preventDefault(); setHobbyActive(i => (i <= 0 ? n - 1 : i - 1)); return }
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (hobbyActive >= 0 && hobbyActive < n) addHobby(filteredHobbySuggestions[hobbyActive])
                            else addHobby(hobbyQuery)
                            return
                          }
                          if (e.key === 'Escape') { setHobbyOpen(false); return }
                        }}
                      />
                      {filteredHobbySuggestions.length > 0 && (
                        <ul className="combo-list" role="listbox" style={{ marginTop: 0 }}>
                          {filteredHobbySuggestions.map((h, idx) => (
                            <li key={h}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={idx === hobbyActive}
                                className={`combo-item${idx===hobbyActive ? ' active' : ''}`}
                                title={h}
                                onMouseDown={(e) => { e.preventDefault(); addHobby(h) }}
                                onMouseEnter={() => setHobbyActive(idx)}
                              >
                                {h}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {hobbyQuery.trim() && (
                        <button type="button" className="btn btn-primary" onClick={() => addHobby(hobbyQuery)}>
                          Add "{hobbyQuery.trim()}"
                        </button>
                      )}
                      {!hobbyQuery.trim() && filteredHobbySuggestions.length === 0 && (
                        <div className="helper">Type a new hobby or pick from existing.</div>
                      )}
                    </div>
                  </div>
                )}
                {fieldErrors.hobbies && <div id="student-hobbies-error" className="error" role="alert">{fieldErrors.hobbies}</div>}
              </div>
            </div>

            {/* Right column stack: Needs only */}
            <div className="field-stack">
              <div className="field">
                <label>Which of the following best describes your additional needs or disability? <span className="helper">Tick all that apply</span></label>
                <div role="group" aria-label="Additional needs">
                  <div style={{ display:'flex', gap:'.5rem', marginBottom:'.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={selectAllNeeds} disabled={allSelected}>Select all</button>
                    <button type="button" className="btn btn-secondary" onClick={clearAllNeeds} disabled={form.needs.length === 0}>Clear all</button>
                  </div>
                  <div className="checklist-grid">
                    {NEED_OPTIONS.map(opt => (
                      <React.Fragment key={opt}>
                        <input type="checkbox" checked={form.needs.includes(opt)} onChange={() => toggleNeed(opt)} />
                        <span className="check-label">{opt}</span>
                      </React.Fragment>
                    ))}
                  </div>
                  {form.needs.includes('Other') && (
                    <div className="check-other">
                      <input
                        name="needsOtherText"
                        aria-label="Other needs"
                        placeholder="Specify other needs"
                        value={form.needsOtherText}
                        onChange={onChange}
                      />
                    </div>
                  )}
                  {fieldErrors.needs && <div className="error" role="alert">{fieldErrors.needs}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* No inline error banner; spacing removed */}
        </form>
        <div className="wizard-actions">
          <button className="btn-primary" type="submit" form="student-form" disabled={busy}>{busy ? 'Saving…' : (editingId ? 'Update student' : 'Register student')}</button>
          {editingId && <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} onClick={resetForm}>Cancel</button>}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Students</h2>
        <div style={{ display:'flex', gap:'.5rem', alignItems:'center', marginBottom:'.5rem' }}>
          <input aria-label="Filter by name" placeholder="Filter by name" value={filter} onChange={e => setFilter(e.target.value)} />
          <label className="helper">Page size</label>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
            {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>DOB</th>
              <th>Guardian</th>
              {/* Address is stored on Guardian */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(s => (
              <tr key={s.id}>
                <td>{s.childName}</td>
                <td>{s.childDob}</td>
                <td>{(guardians.find(g => g.id === s.guardianId)?.fullName) || s.guardianId}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => onEdit(s)}>Edit</button>
                  <button className="btn" style={{ marginLeft: 8, background:'#8b1e1e' }} onClick={() => onDelete(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display:'flex', gap:'.5rem', alignItems:'center', marginTop:'.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}>Prev</button>
          <span className="helper">Page {page+1} of {Math.max(1, Math.ceil(filtered.length / pageSize))}</span>
          <button className="btn btn-secondary" onClick={() => setPage(p => (p+1 < Math.ceil(filtered.length / pageSize) ? p+1 : p))} disabled={(page+1)>=Math.ceil(filtered.length / pageSize)}>Next</button>
        </div>
      </div>
    </section>
  )
}

export default Students
