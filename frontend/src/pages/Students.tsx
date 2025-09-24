import React, { useEffect, useMemo, useRef, useState } from 'react'
import { DatePicker } from '../lib/ui/DatePicker'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useNavigate } from 'react-router-dom'
import { validateStudent, validateStudentField } from '../lib/validation'
import { MSG } from '../lib/messages'
import { Icon } from '../components/Icon'

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
  createdAt?: string
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
  const [loading, setLoading] = useState(false)
  const [reload, setReload] = useState(0)
  // Modal dialog for success/error
  const [dialog, setDialog] = useState<null | {
    type: 'success' | 'error'
    title: string
    message: string
    status?: number
    code?: string
    url?: string
    details?: unknown
    raw?: string
    restoreId?: UUID
  }>(null)

  // Modal dialog for delete/restore confirmation, and legacy edit structure (edit body is currently disabled)
  type EditFormFull = { childName: string; childDob: string; hobbies: string; needs: string[]; needsOtherText: string; guardianId: UUID | ''; guardianName: string }
  type EditFormMinimal = { childName: string; childDob: string }
  type EditDialogEdit = { mode: 'edit'; id: UUID; form: EditFormFull; errors: { childName?: string; childDob?: string; guardianId?: string }; busy?: boolean }
  type EditDialogOther = { mode: 'delete' | 'restore'; id: UUID; form: EditFormMinimal; errors: {}; busy?: boolean }
  type EditDialogState = EditDialogEdit | EditDialogOther
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null)

  function isEditDialogEdit(d: EditDialogState | null): d is EditDialogEdit {
    return !!d && d.mode === 'edit'
  }
  const [editGuardianOpen, setEditGuardianOpen] = useState(false)
  const [editGuardianActiveIndex, setEditGuardianActiveIndex] = useState(-1)
  const [editGuardiansBusy, setEditGuardiansBusy] = useState(false)
  // Cache all guardians we've seen during this modal session to allow reverse typing (backspacing)
  const guardiansCacheRef = React.useRef<Record<string, Guardian>>({})
  // Track last guardian search query to enable direction-aware (growth vs shrink) behavior
  const lastGuardianQueryRef = React.useRef('')

  const [filter, setFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [dobFilter, setDobFilter] = useState('')
  const [guardianFilter, setGuardianFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(pageSizeDefault)
  const [showArchived, setShowArchived] = useState(false)
  type SortKey = 'childName' | 'childDob' | 'guardian'
  const [sortKey, setSortKey] = useState<SortKey>('childName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)
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
  // Debug trace for edit modal actions (temporary instrumentation)
  const [editTrace, setEditTrace] = useState<string[]>([])

  // Inline edit form state (must be declared before any hooks/useMemo that reference it)
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

  // Hobbies helpers used by the chip UI and popover
  const normalizeHobby = (h: string) => (h || '').trim().replace(/\s+/g, ' ')
  const parseHobbies = (text: string | undefined) =>
    (text || '')
      .split(/[\n,]/)
      .map(normalizeHobby)
      .filter(Boolean)

  // Aggregate hobby usage across all students to compute chip "heat"
  const hobbyCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of students) {
      for (const h of parseHobbies(s.hobbies)) {
        const k = normalizeHobby(h)
        m.set(k, (m.get(k) || 0) + 1)
      }
    }
    return m
  }, [students])

  const chipHeat = (h: string) => {
    const c = hobbyCounts.get(normalizeHobby(h)) || 1
    // 1: rare, 2: common, 3: very common
    return c > 5 ? 3 : c > 2 ? 2 : 1
  }

  const allHobbies = useMemo(() => {
    const set = new Set<string>()
    for (const s of students) {
      for (const h of parseHobbies(s.hobbies)) set.add(normalizeHobby(h))
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [students])

  const filteredHobbySuggestions = useMemo(() => {
    const q = hobbyQuery.trim().toLowerCase()
    const existing = new Set(parseHobbies(form.hobbies).map(normalizeHobby))
    return allHobbies
      .filter(h => !existing.has(h) && (!q || h.toLowerCase().includes(q)))
      .slice(0, 20)
  }, [allHobbies, hobbyQuery, form.hobbies])

  function addHobby(h: string) {
    const hh = normalizeHobby(h)
    if (!hh) return
    const list = parseHobbies(form.hobbies)
    if (list.includes(hh)) { setHobbyQuery(''); return }
    const next = [...list, hh].join(', ')
    setForm(f => ({ ...f, hobbies: next }))
    setHobbyQuery('')
    setHobbyOpen(false)
  }

  function removeHobby(h: string) {
    const hh = normalizeHobby(h)
    const next = parseHobbies(form.hobbies).filter(x => x !== hh).join(', ')
    setForm(f => ({ ...f, hobbies: next }))
  }

  

  const branchId = useMemo(() => user?.branchId, [user])
  const isAdmin = !!user?.roles?.some((r: string) => r === 'ADMIN' || r === 'SUPER_ADMIN')

  function friendlyError(err: unknown, fallback: string): string {
    const e = err as any
    if (e && e.status !== undefined) {
      if (e.status === 0 || [502,503,504].includes(e.status)) return 'Service temporarily unavailable. Please try again.'
      if (e.status === 404) return 'Resource not found.'
      if (e.status === 400) return 'Invalid request. Please review the form fields.'
      if (e.status === 409) return 'Conflict. Another record may already exist.'
    }
    return fallback
  }

  // Attempt to extract an archived student id from backend conflict hint
  function parseRestoreId(details: unknown): UUID | undefined {
    try {
      if (!details) return undefined
      if (Array.isArray(details)) {
        for (const d of details as any[]) {
          const msg = (d && (d.message || d.msg || d.toString())) as string
          if (typeof msg === 'string') {
            const m = msg.match(/archivedId\s*[=:]\s*([0-9a-fA-F-]{36})/)
            if (m && m[1]) return m[1] as UUID
            try {
              const parsed = JSON.parse(msg)
              if (parsed && typeof parsed === 'object' && parsed.archivedId) return parsed.archivedId as UUID
            } catch {}
          }
        }
      }
      if (typeof details === 'object' && details !== null) {
        const anyDet = details as any
        if (anyDet.archivedId && typeof anyDet.archivedId === 'string') return anyDet.archivedId as UUID
      }
    } catch {}
    return undefined
  }

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

  // Map UI labels to backend enum names (student-service Need.java)
  const NEED_ENUM_MAP: Record<string, string> = useMemo(() => ({
    'Physical': 'PHYSICAL',
    'Hearing': 'HEARING',
    'Social/ Communication (Autism)': 'SOCIAL_COMMUNICATION_AUTISM',
    'Mental/ Emotional health': 'MENTAL_EMOTIONAL_HEALTH',
    'Health conditional (e.g Epilepsy)': 'HEALTH_CONDITION',
    'Mobility': 'MOBILITY',
    'Visual': 'VISUAL',
    'Speech/ Language': 'SPEECH_LANGUAGE',
    'Learning': 'LEARNING',
    'Other': 'OTHER'
  }), [])
  const NEED_LABEL_MAP: Record<string, string> = useMemo(() => {
    const rev: Record<string, string> = {}
    Object.entries(NEED_ENUM_MAP).forEach(([label, en]) => { rev[en] = label })
    return rev
  }, [NEED_ENUM_MAP])

  useEffect(() => {
    let on = true
    async function load() {
      setLoading(true)
      try {
        const urlS = showArchived ? '/students?archived=true' : '/students'
        const fbS = showArchived ? '/_student/students?archived=true' : '/_student/students'
        const studs = await api.get<Student[]>(urlS, token).catch(async (e: any) => {
          if (e instanceof ApiError && e.status === 404) return [] as Student[]
          if (e instanceof ApiError && [0,502,503,504].includes(e.status)) {
            try { return await api.get<Student[]>(fbS, token) } catch { return [] as Student[] }
          }
          try { return await api.get<Student[]>(fbS, token) } catch { return [] as Student[] }
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
      } finally { setLoading(false) }
    }
    load()
    return () => { on = false }
  }, [token, logout, navigate, toast, showArchived, reload])

  // Ensure guardian input reflects the selected guardian once guardians are available (e.g., when editing)
  useEffect(() => {
    if (form.guardianId) {
      const g = guardians.find(x => x.id === form.guardianId)
      if (g && guardianInput !== g.fullName) {
        setGuardianInput(g.fullName)
      }
    }
  }, [guardians, form.guardianId])

  // When edit modal is open, ensure guardian name reflects the saved guardian once guardians list loads
  useEffect(() => {
    if (!isEditDialogEdit(editDialog) || !editDialog.form.guardianId) return
    const g = guardians.find(x => x.id === editDialog.form.guardianId)
    if (g && editDialog.form.guardianName !== g.fullName) {
      setEditDialog(d => isEditDialogEdit(d) ? { ...d, form: { ...d.form, guardianName: g.fullName } } : d)
    }
  }, [guardians, isEditDialogEdit(editDialog) ? editDialog.form.guardianId : ''])

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

  // Needs checklist handlers for inline form
  function toggleNeed(opt: string) {
    setForm(f => {
      const has = f.needs.includes(opt)
      const next = has ? f.needs.filter(x => x !== opt) : [...f.needs, opt]
      // If Other is removed, clear its text
      const nextOtherText = (opt === 'Other' && !next.includes('Other')) ? '' : f.needsOtherText
      return { ...f, needs: next, needsOtherText: nextOtherText }
    })
    setTouched(prev => ({ ...prev, needs: true }))
    setFieldErrors(prev => {
      const current = form.needs
      const hasAtLeastOne = (current && current.length > 0) || (form.needsOtherText?.trim()?.length || 0) > 0
      return { ...prev, needs: hasAtLeastOne ? undefined : 'Please select at least one need (or specify Other).' }
    })
  }

  const allSelected = useMemo(() => form.needs.length === NEED_OPTIONS.length, [form.needs, NEED_OPTIONS])
  function selectAllNeeds() {
    setForm(f => ({ ...f, needs: [...NEED_OPTIONS] }))
    setTouched(prev => ({ ...prev, needs: true }))
    setFieldErrors(prev => ({ ...prev, needs: undefined }))
  }
  function clearAllNeeds() {
    setForm(f => ({ ...f, needs: [], needsOtherText: f.needsOtherText }))
    setTouched(prev => ({ ...prev, needs: true }))
    setFieldErrors(prev => ({ ...prev, needs: 'Please select at least one need (or specify Other).' }))
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
        // Map human-friendly labels to backend enum names
        needs: form.needs && form.needs.length ? form.needs.map(n => NEED_ENUM_MAP[n] || 'OTHER') : undefined,
        needsOtherText: form.needsOtherText?.trim() || undefined,
        branchId
      }
      if (editingId) {
        const updated = await api.put<Student>(`/students/${editingId}`, payload, token)
        setStudents(s => s.map(x => x.id === editingId ? updated : x))
        setDialog({ type: 'success', title: 'Success', message: 'Student updated successfully!' })
      } else {
        let created: Student
        try {
          created = await api.post<Student>('/students', payload, token)
        } catch (e: any) {
          // Fallback to direct student-service during dev if gateway path is not wired yet
          if (e instanceof ApiError && (e.status === 404 || [0, 502, 503, 504].includes(e.status))) {
            created = await api.post<Student>('/_student/students', payload, token)
          } else if (e instanceof ApiError && e.status === 409) {
            const restoreId = parseRestoreId(e.details)
            setDialog({
              type: 'error',
              title: 'Duplicate student',
              message: restoreId
                ? 'A student with the same details exists in the archive. You can restore it instead.'
                : 'A student with the same details already exists.',
              restoreId
            })
            return
          } else { throw e }
        }
        // Ensure new item has a createdAt so sorting puts it on top even if backend omitted it
        if (!created.createdAt) created.createdAt = new Date().toISOString()
        setStudents(s => [created, ...s])
  setDialog({ type: 'success', title: 'Success', message: 'Student registered successfully!!!' })
      }
      resetForm()
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        toast.show(MSG.sessionExpired, 'error')
        logout(); navigate('/login', { replace: true }); return
      }
      const isApi = e instanceof ApiError
      const msg = friendlyError(e, editingId ? 'Failed to update student' : 'Failed to register student')
      setDialog({
        type: 'error',
        title: 'Request failed',
        message: msg,
        status: isApi ? (e as ApiError).status : undefined,
        code: isApi ? (e as ApiError).code : undefined,
        url: isApi ? (e as ApiError).url : undefined,
        details: isApi ? (e as ApiError).details : undefined,
        raw: isApi ? (e as ApiError).responseText : undefined
      })
    } finally { setBusy(false) }
  }

  // Open modal-based edit with prefilled values
  function openEditDialog(s: Student) {
    const g = guardians.find(x => x.id === s.guardianId)
    // Map backend enums to UI labels for needs
    const needsLabels = Array.isArray(s.needs)
      ? s.needs.map(en => NEED_LABEL_MAP[en] || en).filter(lbl => NEED_OPTIONS.includes(lbl))
      : []
    setEditDialog({
      mode: 'edit',
      id: s.id,
      form: {
        childName: s.childName || '',
        childDob: s.childDob || '',
        hobbies: s.hobbies || '',
        needs: needsLabels,
        needsOtherText: s.needsOtherText || '',
        guardianId: (s.guardianId || '') as any,
        guardianName: g?.fullName || ''
      },
      errors: {},
      busy: false
    })
  }

  function openDeleteDialog(s: Student) {
    setEditDialog({
      mode: 'delete',
      id: s.id,
      form: { childName: s.childName || '', childDob: s.childDob || '' },
      errors: {},
      busy: false
    })
  }

  function openRestoreDialog(s: Student) {
    setEditDialog({
      mode: 'restore',
      id: s.id,
      form: { childName: s.childName || '', childDob: s.childDob || '' },
      errors: {},
      busy: false
    })
  }

  function onEditDialogChange(name: 'childName'|'childDob'|'hobbies'|'needsOtherText'|'guardianName', raw: unknown) {
    // Close guardian dropdown when editing other fields so it doesn't overlay or capture events
    if (name !== 'guardianName') setEditGuardianOpen(false)
    const value = (raw ?? '').toString()
    setEditDialog(prev => {
      if (!prev) return prev
      if (!isEditDialogEdit(prev)) return prev // only editable in full edit mode
      const nextForm: EditFormFull = { ...prev.form, [name]: value } as EditFormFull
      if (name === 'guardianName') {
        return { ...prev, form: nextForm }
      }
      let err: string | undefined
      try { err = validateStudentField(name as any, value as any) } catch { err = undefined }
      return { ...prev, form: nextForm, errors: { ...prev.errors, [name]: err } }
    })
  }

  function toggleEditNeed(opt: string) {
    setEditDialog(d => {
      if (!isEditDialogEdit(d)) return d
      const has = d.form.needs.includes(opt)
      const next = has ? d.form.needs.filter((x: string) => x !== opt) : [...d.form.needs, opt]
      const nextOtherText = (opt === 'Other' && !next.includes('Other')) ? '' : d.form.needsOtherText
      return { ...d, form: { ...d.form, needs: next, needsOtherText: nextOtherText } }
    })
  }

  async function onEditDialogSubmit(e?: React.FormEvent) {
    try { e?.preventDefault() } catch {}
    if (!editDialog) { try { console.warn('Edit submit invoked but editDialog is null') } catch {}; return }
    if (editDialog.mode !== 'edit') { try { console.warn('Edit submit ignored because mode is', editDialog.mode) } catch {}; return }
    setEditTrace(t => [...t.slice(-20), `CLICK ${(new Date()).toISOString()}`])
    try { console.log('[StudentEdit] Begin submit', { id: editDialog.id, form: editDialog.form }) } catch {}
  if (!isEditDialogEdit(editDialog)) return
  const { childName, childDob, hobbies, needs, needsOtherText, guardianId } = editDialog.form
    let errName: string | undefined
    let errDob: string | undefined
    let errGuardian: string | undefined
    try {
      errName = validateStudentField('childName' as any, childName as any)
      errDob = validateStudentField('childDob' as any, childDob as any)
      errGuardian = guardianId ? undefined : 'Please select a guardian'
      setEditTrace(t => [...t.slice(-20), 'VALIDATION_RAN'])
    } catch (valErr: any) {
      setEditTrace(t => [...t.slice(-20), `VALID_CRASH ${(valErr && valErr.message) || valErr}`])
      try { console.error('[StudentEdit] Validation crash', valErr) } catch {}
      setDialog({ type: 'error', title: 'Validation error', message: 'Validation crashed before completing.', details: valErr?.message || String(valErr) })
      return
    }
    if (errName || errDob || errGuardian) {
      try { console.warn('[StudentEdit] Validation failed', { errName, errDob, errGuardian }) } catch {}
      setEditTrace(t => [...t.slice(-20), `VALIDATION_FAIL name=${!!errName} dob=${!!errDob} guardian=${!!errGuardian}`])
      setEditDialog({ ...editDialog, errors: { childName: errName, childDob: errDob, guardianId: errGuardian } })
      toast.show(MSG.fixFields, 'error')
      // Also surface a details dialog so users see exactly what's wrong
      setDialog({
        type: 'error',
        title: 'Fix fields',
        message: 'Please review the highlighted fields and try again.',
        details: {
          childName: errName || undefined,
          childDob: errDob || undefined,
          guardianId: errGuardian || undefined
        }
      })
      return
    }
    // Tiny toast on start
    try { toast.show('Saving changes…', 'info') } catch {}
    setEditDialog({ ...editDialog, busy: true })
    try {
      const existing = students.find(x => x.id === editDialog.id)
      if (!existing) throw new Error('Student not found in list')
      try { console.log('[StudentEdit] Found existing student', existing) } catch {}
      setEditTrace(t => [...t.slice(-20), 'FOUND_EXISTING'])
      setEditTrace(t => [...t.slice(-20), 'BUILD_PAYLOAD'])
      const payload = {
        guardianId: guardianId,
        childName: childName.trim(),
        childDob: childDob,
        hobbies: (hobbies || '').trim() || undefined,
        // Map UI labels to backend enum names
        needs: (needs && needs.length) ? needs.map(n => NEED_ENUM_MAP[n] || 'OTHER') : undefined,
        needsOtherText: (needsOtherText || '').trim() || undefined
        // Intentionally omit branchId on update; server stamps/validates branch from security context
      }
      try { console.log('[StudentEdit] Payload', payload) } catch {}
      setEditTrace(t => [...t.slice(-20), 'CALL_GATEWAY'])
      let updated: Student
      try {
        updated = await api.put<Student>(`/students/${editDialog.id}`, payload, token)
        try { console.log('[StudentEdit] Updated via gateway', updated) } catch {}
        setEditTrace(t => [...t.slice(-20), 'GATEWAY_OK'])
      } catch (e: any) {
        try { console.warn('[StudentEdit] Gateway update failed, trying fallback', e) } catch {}
        setEditTrace(t => [...t.slice(-20), `GATEWAY_FAIL ${(e && (e.status||e.message))}`])
        if (e instanceof ApiError && (e.status === 404 || [0, 502, 503, 504].includes(e.status))) {
          setEditTrace(t => [...t.slice(-20), 'CALL_FALLBACK'])
          // Fallback to direct student-service path in dev
          updated = await api.put<Student>(`/_student/students/${editDialog.id}`, payload, token)
          try { console.log('[StudentEdit] Updated via fallback', updated) } catch {}
          setEditTrace(t => [...t.slice(-20), 'FALLBACK_OK'])
        } else { throw e }
      }
  setStudents(s => s.map(x => x.id === editDialog.id ? { ...updated, createdAt: updated.createdAt || x.createdAt } : x))
  // Tiny toast on success; keep dialog for explicit confirmation
      try { toast.show('Student updated', 'success') } catch {}
      setDialog({ type: 'success', title: 'Success', message: 'Student updated successfully!' })
  setEditDialog(null)
  // Clear inline edit state to exit edit mode on the left form
  resetForm()
      setEditTrace(t => [...t.slice(-20), 'SUCCESS'])
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        toast.show(MSG.sessionExpired, 'error'); logout(); navigate('/login', { replace: true }); return
      }
      const isApi = e instanceof ApiError
      const msg = friendlyError(e, 'Failed to update student')
      try { console.error('Update student failed:', e) } catch {}
      toast.show(msg, 'error')
      // Show a detailed error dialog with status/code/url and details/raw payload
      setDialog({
        type: 'error',
        title: 'Request failed',
        message: msg,
        status: isApi ? (e as ApiError).status : undefined,
        code: isApi ? (e as ApiError).code : undefined,
        url: isApi ? (e as ApiError).url : undefined,
        details: isApi ? (e as ApiError).details : undefined,
        raw: isApi ? (e as ApiError).responseText : undefined
      })
      setEditTrace(t => [...t.slice(-20), `ERROR ${(e && (e.status||e.message))}`])
    } finally {
      setEditDialog(d => (d ? { ...d, busy: false } : d))
      try { console.log('[StudentEdit] Submit finished') } catch {}
      setEditTrace(t => [...t.slice(-20), 'FINISHED'])
    }
  }

  // Immediate server-backed guardian search inside edit modal (no debounce), with simple race protection
  useEffect(() => {
    if (!editDialog) return
    let active = true
  // guardianName only exists on the extended edit form variant; guard with in-operator
  const q = (isEditDialogEdit(editDialog) ? editDialog.form.guardianName : '').trim()
    const prev = lastGuardianQueryRef.current
    const isShrink = prev && prev.length > q.length && prev.startsWith(q)
    lastGuardianQueryRef.current = q

    // If user is deleting characters (query shrinks) and we already have a cache, perform client-side
    // filtering only. This prevents an empty server response from temporarily clearing prior matches.
    if (isShrink) {
      const cached = Object.values(guardiansCacheRef.current)
      const filtered = q
        ? cached.filter(g => g.fullName.toLowerCase().includes(q.toLowerCase()))
        : cached // show all cached (initial fetch) when cleared
      if (active) setGuardians(filtered)
      return () => { active = false }
    }
    ;(async () => {
      setEditGuardiansBusy(true)
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
        // Merge into cache (dedupe by id) BEFORE applying empty-response fallback
        for (const g of list) guardiansCacheRef.current[g.id] = g

        // If server returned empty for a non-empty query, attempt cached filtering.
        if (q && list.length === 0) {
          const cachedFiltered = Object
            .values(guardiansCacheRef.current)
            .filter(g => g.fullName.toLowerCase().includes(q.toLowerCase()))
          if (cachedFiltered.length > 0) list = cachedFiltered
        }

        // Sort by name for consistency (stable UX) when we have results.
        if (list.length > 1) {
          list = [...list].sort((a, b) => a.fullName.localeCompare(b.fullName))
        }

        if (active) setGuardians(list)
      } finally { setEditGuardiansBusy(false) }
    })()
    return () => { active = false }
  }, [isEditDialogEdit(editDialog) ? editDialog.form.guardianName : '', token])

  async function onEditDialogDelete() {
    if (!editDialog) return
    setEditDialog({ ...editDialog, busy: true })
    try {
      try {
        await api.delete<void>(`/students/${editDialog.id}`, token)
      } catch (e: any) {
        if (e instanceof ApiError && (e.status === 404 || [0, 502, 503, 504].includes(e.status))) {
          // Fallback to direct student-service path in dev
          await api.delete<void>(`/_student/students/${editDialog.id}`, token)
        } else { throw e }
      }
      setStudents(s => s.filter(x => x.id !== editDialog.id))
      toast.show(MSG.studentDeleted, 'success')
      setEditDialog(null)
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        toast.show(MSG.sessionExpired, 'error'); logout(); navigate('/login', { replace: true }); return
      }
      toast.show(friendlyError(e, 'Failed to delete student'), 'error')
    } finally {
      setEditDialog(d => (d ? { ...d, busy: false } : d))
    }
  }

  async function onEditDialogRestore() {
    if (!editDialog) return
    setEditDialog({ ...editDialog, busy: true })
    try {
      try {
        await api.post<void>(`/students/${editDialog.id}/restore`, {}, token)
      } catch (e: any) {
        if (e instanceof ApiError && (e.status === 404 || [0, 502, 503, 504].includes(e.status))) {
          await api.post<void>(`/_student/students/${editDialog.id}/restore`, {}, token)
        } else { throw e }
      }
      // After restoring from archived view, remove from current (archived) page so it disappears
      setStudents(s => s.filter(x => x.id !== editDialog.id))
      toast.show('Student restored', 'success')
      setEditDialog(null)
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        toast.show(MSG.sessionExpired, 'error'); logout(); navigate('/login', { replace: true }); return
      }
      toast.show(friendlyError(e, 'Failed to restore student'), 'error')
    } finally {
      setEditDialog(d => (d ? { ...d, busy: false } : d))
    }
  }

  function onEdit(s: Student) {
    // Inline edit only
    setEditingId(s.id)
    setForm({
      guardianId: s.guardianId,
      childName: s.childName,
      childDob: s.childDob,
      hobbies: s.hobbies || '',
      needsOtherText: s.needsOtherText || '',
      // Keep enums; inline form maps on submit
      needs: Array.isArray(s.needs) ? s.needs : []
    })
    const g = guardians.find(x => x.id === s.guardianId)
    setGuardianInput(g?.fullName || '')
    // Scroll the form into view and focus a field for clarity
    try {
      const el = document.getElementById('student-form')
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => {
        const nameInput = document.getElementById('childName') as HTMLInputElement | null
        nameInput?.focus()
      }, 200)
    } catch {}
  }
  // Stable default sort by createdAt desc (newest first)
  const sortedStudents = useMemo(() => {
    return students.slice().sort((a, b) => {
      const ad = a.createdAt ? Date.parse(a.createdAt) : 0
      const bd = b.createdAt ? Date.parse(b.createdAt) : 0
      return bd - ad
    })
  }, [students])

  // Apply filters and optional column sort
  const filtered = useMemo(() => {
    let list = sortedStudents

    const q = filter.trim().toLowerCase()
    if (q) {
      list = list.filter(s => {
        const g = guardians.find(x => x.id === s.guardianId)
        return (
          (s.childName || '').toLowerCase().includes(q) ||
          (s.childDob || '').toLowerCase().includes(q) ||
          (g?.fullName || '').toLowerCase().includes(q) ||
          (s.hobbies || '').toLowerCase().includes(q)
        )
      })
    }

    const nFilter = nameFilter.trim().toLowerCase()
    if (nFilter) list = list.filter(s => (s.childName || '').toLowerCase().includes(nFilter))
    const dFilter = dobFilter.trim().toLowerCase()
    if (dFilter) list = list.filter(s => (s.childDob || '').toLowerCase().includes(dFilter))
    const gFilter = guardianFilter.trim().toLowerCase()
    if (gFilter) list = list.filter(s => (guardians.find(g => g.id === s.guardianId)?.fullName || '').toLowerCase().includes(gFilter))

    if (sortDir && sortKey) {
      const cmp = (a: Student, b: Student) => {
        let av = ''
        let bv = ''
        if (sortKey === 'childName') { av = a.childName || ''; bv = b.childName || '' }
        else if (sortKey === 'childDob') { av = a.childDob || ''; bv = b.childDob || '' }
        else { av = (guardians.find(g => g.id===a.guardianId)?.fullName)||''; bv = (guardians.find(g => g.id===b.guardianId)?.fullName)||'' }
        const c = av.localeCompare(bv, undefined, { sensitivity: 'base' })
        return sortDir === 'asc' ? c : -c
      }
      list = list.slice().sort(cmp)
    }

    return list
  }, [sortedStudents, filter, nameFilter, guardianFilter, dobFilter, guardians, sortDir, sortKey])

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
                <div className="hobby-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="hobbies" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Hobbies</label>
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
                    {parseHobbies(form.hobbies).map(normalizeHobby).map(h => (
                      <span role="listitem" key={h} className={`chip chip-heat-${chipHeat(h)}`} title={`Used ${hobbyCounts.get(h) || 1} time(s)`}>
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
        <h2 style={{ marginTop: 0, display:'flex', alignItems:'center', gap:8 }}>
          <span>Students</span>
          {showArchived && (
            <span
              aria-label="Viewing archived students"
              title="Viewing archived students"
              style={{
                display:'inline-block',
                padding:'2px 8px',
                borderRadius: '999px',
                fontSize: '.75rem',
                fontWeight: 600,
                color: 'var(--text)',
                background: 'rgba(0,0,0,.05)',
                border: '1px solid var(--line)'
              }}
            >
              Archived
            </span>
          )}
        </h2>
        {/* Toolbar to match Guardians */}
        <div className="table-toolbar">
          <div className="toolbar-left">
            <span>Show</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label="Results per page">
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>result per page</span>
          </div>
          <div className="toolbar-right">
            <input className="input-search" aria-label="Filter in records" placeholder="Filter in records..." value={filter} onChange={e => setFilter(e.target.value)} />
            <button className="btn-icon btn-icon--blue" type="button" title="Clear filter" aria-label="Clear filter"
                    onClick={() => { setFilter(''); setNameFilter(''); setGuardianFilter(''); setDobFilter(''); setPage(0) }}>
              <Icon name="x" />
            </button>
            <button className="btn-icon btn-icon--blue" type="button" title="Refresh" aria-label="Refresh students list"
                    onClick={() => setReload(r => r + 1)} disabled={loading}>
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              {([
                { key:'childName', label:'Name' },
                { key:'childDob', label:'DOB' },
                { key:'guardian', label:'Guardian' }
              ] as const).map(col => (
                <th key={col.key}
                    aria-sort={sortKey===col.key ? (sortDir==='asc' ? 'ascending' : sortDir==='desc' ? 'descending' : 'none') : 'none'}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                    const nextDir = sortKey!==col.key ? 'asc' : (sortDir==='asc' ? 'desc' : sortDir==='desc' ? undefined : 'asc')
                    setSortKey(col.key as any)
                    setSortDir(nextDir as any)
                    setPage(0)
                  }} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontWeight:700 }}>{col.label}</span>
                    {sortKey!==col.key && <Icon name="sort" />}
                    {sortKey===col.key && sortDir==='asc' && <Icon name="sortAsc" />}
                    {sortKey===col.key && sortDir==='desc' && <Icon name="sortDesc" />}
                  </button>
                </th>
              ))}
              <th style={{width:90}}>Action</th>
            </tr>
            <tr className="filter-row">
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Filter by Name" value={nameFilter} onChange={e=>{ setNameFilter(e.target.value); setPage(0); }} />
                    {nameFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setNameFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th style={{ width: 120 }}>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Filter by DOB" value={dobFilter} onChange={e=>{ setDobFilter(e.target.value); setPage(0); }} />
                    {dobFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setDobFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Filter by Guardian" value={guardianFilter} onChange={e=>{ setGuardianFilter(e.target.value); setPage(0); }} />
                    {guardianFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setGuardianFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={4}><div className="helper">{showArchived ? 'No archived students' : 'No records found'}</div></td>
              </tr>
            )}
            {paged.map(s => (
              <tr key={s.id}>
                <td>{s.childName}</td>
                <td>{s.childDob}</td>
                <td>{(guardians.find(g => g.id === s.guardianId)?.fullName) || s.guardianId}</td>
                <td>
                  <div className="action-buttons">
                    {!showArchived ? (
                      <>
                        <button className="btn-icon btn-icon--blue" title="Edit" aria-label="Edit student" onClick={() => openEditDialog(s)}>
                          <Icon name="pencil" />
                        </button>
                        <button className="btn-icon btn-icon--red" title="Delete" aria-label="Delete student" onClick={() => openDeleteDialog(s)}>
                          <Icon name="trash" />
                        </button>
                      </>
                    ) : (
                      isAdmin && (
                        <button className="btn-icon btn-icon--blue" title="Restore" aria-label="Restore student" onClick={() => openRestoreDialog(s)}>
                          <Icon name="restore" />
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footbar">
          <div className="pager">
            <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}>Prev</button>
            <span className="helper">Page {page+1} of {Math.max(1, Math.ceil(filtered.length / pageSize))}</span>
            <button className="btn btn-secondary" onClick={() => setPage(p => (p+1 < Math.ceil(filtered.length / pageSize) ? p+1 : p))} disabled={(page+1)>=Math.ceil(filtered.length / pageSize)}>Next</button>
          </div>
          {isAdmin && (
            <label className="switch-sm switch-rounded" title="Toggle archived students">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={e => { setShowArchived(e.target.checked); setPage(0) }}
                aria-label="Show archived students"
              />
              <span className="label">Show archived</span>
            </label>
          )}
        </div>
      </div>
      {dialog && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <strong id="dialog-title">{dialog.title}</strong>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>{dialog.message}</p>
              {dialog.type === 'error' && (
                <div className="error-details">
                  {dialog.status !== undefined && <div><strong>Status:</strong> {dialog.status}</div>}
                  {dialog.code && <div><strong>Code:</strong> {dialog.code}</div>}
                  {dialog.url && <div><strong>URL:</strong> {dialog.url}</div>}
                  {(dialog.details !== undefined && dialog.details !== null) && (
                    <pre className="pre-scroll">{typeof dialog.details === 'string' ? dialog.details : JSON.stringify(dialog.details as any, null, 2)}</pre>
                  )}
                  {dialog.raw && !(dialog.details !== undefined && dialog.details !== null) && (
                    <pre className="pre-scroll">{dialog.raw}</pre>
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions">
              {dialog.restoreId && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      try {
                        await api.post<void>(`/students/${dialog.restoreId}/restore`, {}, token)
                      } catch (e: any) {
                        if (e instanceof ApiError && (e.status === 404 || [0, 502, 503, 504].includes(e.status))) {
                          await api.post<void>(`/_student/students/${dialog.restoreId}/restore`, {}, token)
                        } else { throw e }
                      }
                      toast.show('Student restored', 'success')
                      setDialog(null)
                      setReload(r => r + 1)
                      setPage(0)
                    } catch (err: any) {
                      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) { toast.show(MSG.sessionExpired, 'error'); logout(); return }
                      const msg = err?.message || 'Failed to restore student'
                      toast.show(msg, 'error')
                    }
                  }}
                >
                  Restore instead
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setDialog(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
      {editDialog && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-student-title" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <strong id="edit-student-title">{editDialog.mode === 'edit' ? 'Edit student' : editDialog.mode === 'delete' ? 'Delete student' : 'Restore student'}</strong>
            </div>
            <div className="modal-body">
              {editDialog.mode === 'delete' ? (
                <div>
                  <p style={{ marginTop: 0 }}>Are you sure you want to delete this student? This is a soft delete for archiving, and it will be removed from active lists.</p>
                  <div className="confirm-summary">
                    <div><strong>Name:</strong> {editDialog.form.childName || '-'}</div>
                    <div><strong>DOB:</strong> {editDialog.form.childDob || '-'}</div>
                  </div>
                </div>
              ) : editDialog.mode === 'restore' ? (
                <div>
                  <p style={{ marginTop: 0 }}>This will restore the student back to active lists.</p>
                  <div className="confirm-summary">
                    <div><strong>Name:</strong> {editDialog.form.childName || '-'}</div>
                    <div><strong>DOB:</strong> {editDialog.form.childDob || '-'}</div>
                  </div>
                </div>
              ) : (
                <form id="edit-student-form" className="form-modern" onSubmit={onEditDialogSubmit}>
                  {/* Debug panel removed after stabilization */}
                  <div className="form-2col">
                    <div className="field" style={{ position: 'relative' }}>
                      <label htmlFor="es-guardian" className="req">Guardian</label>
                      <input
                        id="es-guardian"
                        aria-label="Guardian"
                        placeholder="Search and select a guardian"
                        autoComplete="off"
                        value={isEditDialogEdit(editDialog) ? editDialog.form.guardianName : ''}
                        onChange={e => {
                          const v = e.target.value
                          onEditDialogChange('guardianName', v)
                          // Always open and reset selection when user types or deletes
                          setEditGuardianOpen(true)
                          setEditGuardianActiveIndex(-1)
                          setEditDialog(d => isEditDialogEdit(d) ? { ...d, form: { ...d.form, guardianId: '' as any } } : d)
                        }}
                        onFocus={() => setEditGuardianOpen(true)}
                        onBlur={() => {
                          // Delay closing to allow click selection (use setTimeout micro-task)
                          setTimeout(() => setEditGuardianOpen(false), 120)
                          setEditDialog(d => {
                            if (!isEditDialogEdit(d)) return d
                            if (d.form.guardianId) return { ...d, errors: { ...d.errors, guardianId: undefined } }
                            const q = (d.form.guardianName || '').trim().toLowerCase()
                            const match = guardians.find(g => g.fullName.toLowerCase() === q)
                            if (match) {
                              return { ...d, form: { ...d.form, guardianId: match.id, guardianName: match.fullName }, errors: { ...d.errors, guardianId: undefined } }
                            }
                            return { ...d, form: { ...d.form, guardianName: '' }, errors: { ...d.errors, guardianId: 'Please select a guardian' } }
                          })
                        }}
                        onKeyDown={e => {
                          const q = (isEditDialogEdit(editDialog) ? editDialog.form.guardianName : '').trim().toLowerCase()
                          const list = guardians.filter(g => !q || g.fullName.toLowerCase().includes(q))
                          const n = list.length
                          if (e.key === 'ArrowDown') { e.preventDefault(); setEditGuardianOpen(true); if (n>0) setEditGuardianActiveIndex(i => (i+1)%n); return }
                          if (e.key === 'ArrowUp') { e.preventDefault(); setEditGuardianOpen(true); if (n>0) setEditGuardianActiveIndex(i => (i<=0? n-1 : i-1)); return }
                          if (e.key === 'Enter') {
                            if (editGuardianOpen && editGuardianActiveIndex>=0 && editGuardianActiveIndex<n) {
                              e.preventDefault();
                              const g = list[editGuardianActiveIndex]
                              setEditDialog(d => isEditDialogEdit(d) ? { ...d, form: { ...d.form, guardianId: g.id, guardianName: g.fullName }, errors: { ...d.errors, guardianId: undefined } } : d)
                              setEditGuardianOpen(false)
                            }
                            return
                          }
                          if (e.key === 'Escape') { setEditGuardianOpen(false); return }
                        }}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={editGuardianOpen}
                        aria-invalid={isEditDialogEdit(editDialog) && !!editDialog.errors.guardianId}
                        aria-describedby={isEditDialogEdit(editDialog) && editDialog.errors.guardianId ? 'es-guardian-error' : undefined}
                      />
                      {editGuardianOpen && (
                        <div className="dropdown-panel">
                          {editGuardiansBusy && <div className="helper" style={{ padding: 8 }}>Searching…</div>}
                          {(() => {
                            const q = (isEditDialogEdit(editDialog) ? editDialog.form.guardianName : '').trim().toLowerCase()
                            const list = guardians.filter(g => !q || g.fullName.toLowerCase().includes(q))
                            return list.length > 0 ? (
                              <ul className="combo-list" role="listbox">
                                {list.map((g, idx) => (
                                  <li key={g.id}>
                                    <button
                                      id={`es-guardian-opt-${g.id}`}
                                      role="option"
                                      aria-selected={idx === editGuardianActiveIndex}
                                      type="button"
                                      onMouseDown={(e) => { e.preventDefault(); setEditDialog(d => isEditDialogEdit(d) ? { ...d, form: { ...d.form, guardianId: g.id, guardianName: g.fullName }, errors: { ...d.errors, guardianId: undefined } } : d); setEditGuardianOpen(false) }}
                                      onMouseEnter={() => setEditGuardianActiveIndex(idx)}
                                      className={`combo-item${idx===editGuardianActiveIndex ? ' active' : ''}`}
                                      title={g.fullName}
                                    >
                                      {g.fullName}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (!editGuardiansBusy ? <div className="helper" style={{ padding: 8 }}>No matches</div> : null)
                          })()}
                        </div>
                      )}
                      {isEditDialogEdit(editDialog) && editDialog.errors.guardianId && <div id="es-guardian-error" className="error" role="alert">{editDialog.errors.guardianId}</div>}
                    </div>
                    <div className="field">
                      <label htmlFor="es-childName" className="req">Child name</label>
       <input id="es-childName" name="childName" required autoComplete="off"
         value={editDialog.form.childName}
         onChange={e => onEditDialogChange('childName', e.target.value)}
         onFocus={() => setEditGuardianOpen(false)} />
                      {isEditDialogEdit(editDialog) && editDialog.errors.childName && <div className="error" role="alert">{editDialog.errors.childName}</div>}
                    </div>
                    <div className="field">
                      <label htmlFor="es-childDob" className="req">Child date of birth</label>
                      <div onMouseDown={() => setEditGuardianOpen(false)}>
                        <DatePicker id="es-childDob" name="childDob" value={editDialog.form.childDob}
                                    onChange={(v) => {
                                      onEditDialogChange('childDob', (v || '').toString())
                                    }}
                                    keepOpenUntilSelect />
                      </div>
                      {isEditDialogEdit(editDialog) && editDialog.errors.childDob && <div className="error" role="alert">{editDialog.errors.childDob}</div>}
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="es-hobbies">Hobbies</label>
                    <textarea id="es-hobbies" name="hobbies" placeholder="Optional (comma or newline separated)"
                              value={isEditDialogEdit(editDialog) ? editDialog.form.hobbies : ''}
                              onChange={e => onEditDialogChange('hobbies', e.target.value)}
                              onFocus={() => setEditGuardianOpen(false)} />
                  </div>

                  <div className="field">
                    <label>Additional needs or disability <span className="helper">Tick all that apply</span></label>
                    <div className="checklist-grid">
                      {NEED_OPTIONS.map(opt => (
                        <React.Fragment key={opt}>
                          <input type="checkbox" checked={isEditDialogEdit(editDialog) && editDialog.form.needs.includes(opt)} onChange={() => toggleEditNeed(opt)} />
                          <span className="check-label">{opt}</span>
                        </React.Fragment>
                      ))}
                    </div>
                    {isEditDialogEdit(editDialog) && editDialog.form.needs.includes('Other') && (
                      <div className="check-other">
                        <input
                          id="es-needsOther"
                          name="needsOtherText"
                          aria-label="Other needs"
                          placeholder="Specify other needs"
                          value={isEditDialogEdit(editDialog) ? editDialog.form.needsOtherText : ''}
                          onChange={e => onEditDialogChange('needsOtherText', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
            <div className="modal-actions">
              {editDialog.mode === 'edit' && (
                <button type="button" onClick={() => onEditDialogSubmit()} className="btn btn-primary" disabled={!!editDialog.busy}>{editDialog.busy ? 'Saving…' : 'Save changes'}</button>
              )}
              {editDialog.mode === 'delete' && (
                <button type="button" className="btn btn-danger" onClick={onEditDialogDelete} disabled={!!editDialog.busy}>{editDialog.busy ? 'Deleting…' : 'Delete student'}</button>
              )}
              {editDialog.mode === 'restore' && (
                <button type="button" className="btn btn-primary" onClick={onEditDialogRestore} disabled={!!editDialog.busy}>{editDialog.busy ? 'Restoring…' : 'Restore student'}</button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setEditDialog(null)} style={{ marginLeft: 8 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Students
