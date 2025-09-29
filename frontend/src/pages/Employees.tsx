import React, { useEffect, useMemo, useState } from 'react'
import PhoneInput from '../components/PhoneInput'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { Icon } from '../components/Icon'
import { DatePicker } from '../lib/ui/DatePicker'
import { listBranches, listDepartments, Branch, Department } from '../lib/hrApi'
import { RWANDA_BANKS } from '../lib/banks'
import { listEmployees, createEmployee, updateEmployee, archiveEmployee, restoreEmployee, EmployeePayload as ApiEmployeePayload } from '../lib/employeeApi'
import { useAuth } from '../lib/auth'
import ConfirmModal from '../components/shared/ConfirmModal'

// Types --------------------------------------------------------------
interface ApiEmployee {
  id: string
  fullName: string
  dob?: string
  address?: string
  position?: string
  salary?: number
  phone?: string
  email?: string
  archived?: boolean
  branch?: { id: string }
  department?: { id: string }
  bankName?: string
  bankAccount?: string
  startDate?: string
  endDate?: string
  createdAt?: string
}

interface FormState {
  fullName: string
  dob: string
  position: string
  salary: string | number
  address: string
  phone: string
  email: string
  departmentId: string
  branchId: string
  bankName: string
  bankAccount: string
  startDate: string
  endDate: string
}

type Errors = Partial<Record<keyof FormState, string>>

// Small Field wrapper ------------------------------------------------
const Field: React.FC<{ id: string; label: React.ReactNode; required?: boolean; error?: string; help?: string; children: React.ReactNode }> = ({ id, label, required, error, help, children }) => (
  <div className="field">
    <label htmlFor={id} className={required ? 'req' : undefined}>{label}</label>
    {children}
    {help && <div className="helper">{help}</div>}
    {error && <div id={id + '-err'} className="error" role="alert">{error}</div>}
  </div>
)

// Validation ---------------------------------------------------------
function validateForm(f: FormState): Errors {
  const e: Errors = {}
  if (!f.fullName.trim()) e.fullName = 'Full name is required'
  if (!f.dob) e.dob = 'Date of birth is required'
  else {
    const now = new Date()
    const eighteenAgo = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
    const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const eighteenAgoISO = toIso(eighteenAgo)
    if (f.dob > eighteenAgoISO) e.dob = 'Employee must be at least 18 years old'
  }
  if (!f.position.trim()) e.position = 'Position required'
  if (!f.salary || isNaN(Number(f.salary)) || Number(f.salary) <= 0) e.salary = 'Salary must be > 0'
  if (!f.address.trim()) e.address = 'Address required'
  if (!f.departmentId.trim()) e.departmentId = 'Department required'
  if (!f.branchId.trim()) e.branchId = 'Branch required'
  const todayIso = new Date(); const todayISO = `${todayIso.getFullYear()}-${String(todayIso.getMonth()+1).padStart(2,'0')}-${String(todayIso.getDate()).padStart(2,'0')}`
  const cmp = (a?: string, b?: string) => (a && b) ? (a < b ? -1 : a > b ? 1 : 0) : undefined
  if (f.startDate) {
    const c = cmp(f.startDate, todayISO)
    if (c !== undefined && c < 0) e.startDate = 'Start date cannot be in the past'
  }
  if (f.startDate && f.endDate) {
    const c = cmp(f.endDate, f.startDate)
    if (c !== undefined && c <= 0) e.endDate = 'End date must be after start date'
  }
  if (f.phone) {
    const phoneClean = f.phone.replace(/\s+/g, '')
    if (!/^\+?\d{9,15}$/.test(phoneClean)) e.phone = 'Invalid phone'
  }
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = 'Invalid email'
  if (f.bankAccount && !/^\d{6,20}$/.test(f.bankAccount.replace(/\s+/g,''))) e.bankAccount = 'Invalid account number'
  return e
}

// Small hover tooltip icon for inline label hints
const InfoIcon: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false)
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      aria-label="info"
    >
      <Icon name="info" size={14} />
      {open && (
        <div role="tooltip" style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#111', color: '#fff', fontSize: 12, padding: '6px 8px', borderRadius: 6, boxShadow: '0 6px 16px rgba(0,0,0,.12)', whiteSpace: 'nowrap', zIndex: 60 }}>
          {text}
        </div>
      )}
    </span>
  )
}

// Component ----------------------------------------------------------
const EmployeesPage: React.FC = () => {
  const toast = useToast()

  // Map form field keys to human-friendly labels for error summaries
  const FIELD_LABELS: Record<keyof FormState, string> = {
    fullName: 'Full name',
    dob: 'Date of birth',
    position: 'Position',
    salary: 'Salary',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    departmentId: 'Department',
    branchId: 'Branch',
    bankName: 'Bank name',
    bankAccount: 'Account number',
    startDate: 'Start date',
    endDate: 'End date'
  }

  const emptyForm: FormState = {
  fullName: '', dob: '', position: '', salary: '', address: '', phone: '', email: '', departmentId: '', branchId: '', bankName: '', bankAccount: '', startDate: '', endDate: ''
  }
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  // Editing (popup modal) state
  interface EditFormState extends FormState {}
  const [editOpen, setEditOpen] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [editErrors, setEditErrors] = useState<Errors>({})
  const [editTouched, setEditTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [editSubmitting, setEditSubmitting] = useState(false)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [archivedMode, setArchivedMode] = useState(false)

  // list / filtering / sorting / paging
  const [filter, setFilter] = useState('')
  type SortKey = 'fullName' | 'position' | 'salary' | 'branch' | 'createdAt'
  // Option B: default sort key conceptually references createdAt, but we leave sortDir undefined so backend newest-first order is preserved visually until user clicks.
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // confirm modal
  const [confirm, setConfirm] = useState<null | { action: 'archive' | 'restore'; emp: ApiEmployee; busy?: boolean }>(null)
  // list reload trigger
  const [reload, setReload] = useState(0)
  // global filter + per-column filters (match guardians list UX)
  const [nameFilter, setNameFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [salaryFilter, setSalaryFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  // auth (for archived toggle visibility)
  const { user } = useAuth?.() || ({} as any)
  const isAdmin = !!user?.roles?.some((r: string) => r === 'ADMIN' || r === 'SUPER_ADMIN')

  // HR options for selects
  const [branches, setBranches] = useState<Branch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [optsLoading, setOptsLoading] = useState(false)
  const filteredDepartments = useMemo(() => {
    if (!form.branchId) return [] as Department[]
    return departments.filter(d => !d.branchId || d.branchId === form.branchId)
  }, [departments, form.branchId])

  // Fetch employees
  useEffect(() => {
    let alive = true
    setLoading(true)
    listEmployees({ archived: archivedMode }).then(list => {
      if (!alive) return
      // Backend now returns newest-first already (ordered by createdAt DESC) so no reverse needed.
      setEmployees(list)
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [archivedMode, reload])

  // Fetch branches/departments for selects
  useEffect(() => {
    let alive = true
    setOptsLoading(true)
    Promise.all([listBranches().catch(()=>[]), listDepartments().catch(()=>[])])
      .then(([b, d]) => {
        if (!alive) return;
        const bs = b || []
        const ds = d || []
        setBranches(bs)
        setDepartments(ds)
        // Auto-select when only one option exists
        if (!form.branchId && bs.length === 1) {
          setForm(f => ({ ...f, branchId: bs[0].id }))
        }
        // If branch already chosen (or just auto-set), and only one department matches, select it
        const branchId = (!form.branchId && bs.length === 1) ? bs[0].id : form.branchId
        if (branchId) {
          const fds = ds.filter(x => !x.branchId || x.branchId === branchId)
          if (!form.departmentId && fds.length === 1) {
            setForm(f => ({ ...f, departmentId: fds[0].id }))
          }
        }
      })
      .finally(() => { if (alive) setOptsLoading(false) })
    return () => { alive = false }
  }, [])

  function resetForm() {
    setForm(emptyForm); setErrors({}); setTouched({}); setSubmitted(false)
  }

  function openCreate() {
    prevFocusRef.current = document.activeElement as HTMLElement | null
    // Auto-select single branch/department if only one available
    setForm(f => {
      let next = { ...emptyForm }
      if (branches.length === 1) next.branchId = branches[0].id
      if (departments.length === 1) next.departmentId = departments[0].id
      else if (next.branchId) {
        const fds = departments.filter(d => !d.branchId || d.branchId === next.branchId)
        if (fds.length === 1) next.departmentId = fds[0].id
      }
      return next
    })
    setErrors({}); setTouched({}); setSubmitted(false); setSubmitting(false)
    setEditOpen(false)
    setCreateOpen(true)
  }

  function closeCreate() {
    setCreateOpen(false)
    resetForm()
    queueMicrotask(()=>{ prevFocusRef.current?.focus() })
  }

  function openEdit(emp: ApiEmployee) {
    // store current focus to restore later
    prevFocusRef.current = document.activeElement as HTMLElement | null
    setCreateOpen(false)
    setEditingEmployeeId(emp.id)
    setEditForm({
      fullName: emp.fullName || '',
      dob: emp.dob || '',
      position: emp.position || '',
      salary: String((emp as any).salary ?? ''),
      address: emp.address || '',
      phone: emp.phone || '',
      email: emp.email || '',
      departmentId: emp.department?.id || '',
      branchId: emp.branch?.id || '',
      bankName: (emp as any).bankName || '',
      bankAccount: (emp as any).bankAccount || '',
      startDate: (emp as any).startDate || '',
      endDate: (emp as any).endDate || ''
    })
    setEditErrors({})
    setEditTouched({})
    setEditingEmployeeId(emp.id)
    setEditOpen(true)
  }

  function closeEdit() {
    setEditOpen(false)
    setEditingEmployeeId(null)
    setEditForm(null)
    setEditErrors({})
    setEditTouched({})
    setEditSubmitting(false)
    // restore focus
    queueMicrotask(()=>{ prevFocusRef.current?.focus() })
  }

  const firstErrorRef = useRef<HTMLInputElement | null>(null)
  function validateAndSet(field?: keyof FormState) {
    const v = validateForm(form)
    setErrors(v)
    if (field) setTouched(t => ({ ...t, [field]: true }))
    return v
  }

  async function submit() {
    setSubmitted(true)
    const v = validateAndSet()
    if (Object.keys(v).length) {
      queueMicrotask(() => firstErrorRef.current?.focus())
      return
    }
    setSubmitting(true)
    const payload: ApiEmployeePayload = {
      fullName: form.fullName.trim(),
      dob: form.dob,
      position: form.position.trim(),
      salary: Number(form.salary),
      address: form.address.trim(),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      bankName: form.bankName || undefined,
      bankAccount: form.bankAccount ? form.bankAccount.replace(/\s+/g, '') : undefined,
      department: { id: form.departmentId },
      branch: { id: form.branchId }
    }
    try {
  const created = await createEmployee(payload)
  // Prepend so the newly created employee appears at the top (newest-first ordering)
  setEmployees(list => [created, ...list])
  toast.show('Employee created', 'success')
  closeCreate()
    } catch (e) {
      const err = e as any
      // Try to project server field errors into the form
      const srvDetails = err?.details
      let hadFieldErrors = false
      const nextFieldKeys: (keyof FormState)[] = []
      if (srvDetails) {
        const next: Partial<Errors> = {}
        try {
          // Pattern 1: array of { field, message }
          if (Array.isArray(srvDetails)) {
            for (const it of srvDetails) {
              if (it && typeof it === 'object') {
                const f = String((it as any).field || '') as keyof FormState
                const m = String((it as any).message || '')
                if (f && m && (f in form)) { next[f] = m; hadFieldErrors = true; nextFieldKeys.push(f) }
              }
            }
          }
          // Pattern 2: object map { field: message }
          else if (typeof srvDetails === 'object') {
            for (const k of Object.keys(srvDetails)) {
              const f = k as keyof FormState
              const m = String((srvDetails as any)[k])
              if (f && m && (f in form)) { next[f] = m; hadFieldErrors = true; nextFieldKeys.push(f) }
            }
          }
        } catch {}
        if (hadFieldErrors) {
          setErrors(prev => ({ ...prev, ...next }))
          setSubmitted(true)
        }
      }

      // Craft a human-friendly message
      let msg: string | undefined
      if (err instanceof ApiError && err.status === 401) msg = 'Your session has expired. Please sign in and try again.'
      else if (err instanceof ApiError && err.status === 403) msg = 'You do not have permission to perform this action.'
      else if (hadFieldErrors) {
        const names = nextFieldKeys.map(k => FIELD_LABELS[k]).filter(Boolean)
        msg = names.length ? `Please fix: ${names.join(', ')}.` : 'Please fix the form errors and try again.'
      }
      else if (err instanceof ApiError) {
        // Choose a friendly base message depending on status/code
        const isServer = err.status >= 500 && err.status < 600
        const genericMsg = !err.message || /^(unexpected error|internal server error)$/i.test(err.message)
        let base: string
        if (err.status === 404) base = 'Service unavailable right now. Please try again.'
        else if (err.status === 409 || String(err.code).toUpperCase().includes('DUPLICATE')) base = 'An employee with similar details already exists.'
        else if (err.status === 400 || err.status === 422) base = 'Please review the form and correct the highlighted fields.'
        else if (isServer || genericMsg || err.code === 'INTERNAL_ERROR') base = 'Something went wrong while saving the employee. Please try again.'
        else base = err.message || 'Request failed'

        // If server sent a helpful plain-text details, surface it
        const detailsText = typeof err.details === 'string' ? err.details.trim() : undefined
        const parts = [base]
        if (detailsText && detailsText.length && detailsText.length <= 200 && !/exception|stack|trace/i.test(detailsText)) {
          parts.push(detailsText)
        }
        const extras = [
          err.status ? `HTTP ${err.status}` : null,
          err.code ? `Code ${err.code}` : null,
          err.traceId ? `Trace ${err.traceId}` : null
        ].filter(Boolean)
        if (extras.length) parts.push(`(${extras.join(', ')})`)
        msg = parts.join(' ')
      } else if (err?.message) msg = String(err.message)
      else if (err?.status) msg = `Request failed (HTTP ${err.status}).`

      if (msg) toast.show(msg, 'error')
    } finally { setSubmitting(false) }
  }

  function toggleSort(key: SortKey) {
    setSortKey(key)
    setSortDir(prev => (sortKey !== key ? 'asc' : prev === 'asc' ? 'desc' : prev === 'desc' ? undefined : 'asc'))
    setPage(0)
  }
  function renderSortIcon(key: SortKey) {
    if (sortKey !== key || !sortDir) return <Icon name="sort" />
    return sortDir === 'asc' ? <Icon name="sortAsc" /> : <Icon name="sortDesc" />
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    let list = employees
    if (q) list = list.filter(e => (
      (e.fullName || '').toLowerCase().includes(q) || (e.position || '').toLowerCase().includes(q) || String((e as any).salary || '').includes(q) || (e.branch?.id || '').toLowerCase().includes(q)
    ))
    // per-column filters
    if (nameFilter.trim()) list = list.filter(e => (e.fullName || '').toLowerCase().includes(nameFilter.trim().toLowerCase()))
    if (positionFilter.trim()) list = list.filter(e => (e.position || '').toLowerCase().includes(positionFilter.trim().toLowerCase()))
    if (salaryFilter.trim()) list = list.filter(e => String((e as any).salary || '').includes(salaryFilter.trim()))
    if (branchFilter.trim()) list = list.filter(e => (e.branch?.id || '').toLowerCase().includes(branchFilter.trim().toLowerCase()))
    // sorting (tri-state)
    if (sortDir) {
      list = list.slice().sort((a,b) => {
        let av: any = ''; let bv: any = ''
        switch (sortKey) {
          case 'fullName': av = a.fullName || ''; bv = b.fullName || ''; break
          case 'position': av = a.position || ''; bv = b.position || ''; break
          case 'salary': av = (a as any).salary || 0; bv = (b as any).salary || 0; break
          case 'branch': av = a.branch?.id || ''; bv = b.branch?.id || ''; break
          case 'createdAt': av = (a as any).createdAt || ''; bv = (b as any).createdAt || ''; break
        }
        if (typeof av === 'string') { const cmp = av.localeCompare(bv); return sortDir === 'asc' ? cmp : -cmp }
        const cmp = (av as number) - (bv as number); return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [employees, filter, nameFilter, positionFilter, salaryFilter, branchFilter, sortKey, sortDir])
  const paged = useMemo(() => { const start = page * pageSize; return filtered.slice(start, start + pageSize) }, [filtered, page, pageSize])
  useEffect(() => { setPage(0) }, [filter, pageSize])

  function onArchive(emp: ApiEmployee) { setConfirm({ action: 'archive', emp }) }
  function onRestore(emp: ApiEmployee) { setConfirm({ action: 'restore', emp }) }
  async function confirmAction() {
    if (!confirm) return
    setConfirm(c => c ? { ...c, busy: true } : c)
    const previous = employees
    setEmployees(l => l.filter(e => e.id !== confirm.emp.id))
    try {
      if (confirm.action === 'archive') { await archiveEmployee(confirm.emp.id); toast.show('Archived', 'info') }
      else { await restoreEmployee(confirm.emp.id); toast.show('Restored', 'success') }
      setConfirm(null)
    } catch (e) {
      toast.show('Operation failed', 'error')
      setEmployees(previous)
      setConfirm(null)
    }
  }

  const visible = paged

  // focus first invalid
  const order: (keyof FormState)[] = ['fullName','dob','position','salary','address','phone','email','departmentId','branchId','bankName','bankAccount']
  useEffect(() => {
    for (const k of order) {
      if (errors[k]) { const el = document.getElementById('create-' + k) as HTMLInputElement | null; if (el) firstErrorRef.current = el; return }
    }
    firstErrorRef.current = null
  }, [errors])

  // Focus first field when opening create modal
  useEffect(()=>{
    if (createOpen) {
      const el = document.getElementById('create-fullName') as HTMLInputElement | null
      el?.focus()
    }
  }, [createOpen])

  // Focus first field when opening edit modal
  useEffect(()=>{
    if (editOpen) {
      const el = document.getElementById('edit-fullName') as HTMLInputElement | null
      el?.focus()
    }
  }, [editOpen])

  // Global ESC key to close any open modal (create/edit)
  useEffect(()=>{
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editOpen) { e.preventDefault(); closeEdit() }
        else if (createOpen) { e.preventDefault(); closeCreate() }
      }
    }
    if (editOpen || createOpen) {
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [editOpen, createOpen])

  // Scroll lock + basic focus trap when modal open
  useEffect(()=>{
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (!(editOpen || createOpen)) return
      const modal = document.querySelector('[data-employee-modal="true"]') as HTMLElement | null
      if (!modal) return
      const focusables = Array.from(modal.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el=> !el.hasAttribute('disabled'))
      if (!focusables.length) return
      const first = focusables[0]; const last = focusables[focusables.length-1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !modal.contains(active)) { e.preventDefault(); last.focus() }
      } else {
        if (active === last) { e.preventDefault(); first.focus() }
      }
    }
    if (editOpen || createOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
      return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }
  }, [editOpen, createOpen])

  // (Hover tooltips handled inline via InfoIcon)

  return (
    <div className="p-4 space-y-4">

      {/* Toolbar + Table */}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Employees</h2>
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="toolbar-left" style={{ gap: 8 }}>
            <button className="btn btn-primary" type="button" onClick={openCreate}>Add employee</button>
            <span>Show</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label="Results per page">
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>result per page</span>
          </div>
          <div className="toolbar-right">
            <input className="input-search" aria-label="Filter in records" placeholder="Filter in records..." value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} />
            <button className="btn-icon btn-icon--blue" type="button" title="Clear filter" aria-label="Clear filter"
                    onClick={() => { setFilter(''); setPage(0) }}>
              <Icon name="x" />
            </button>
            <button className="btn-icon btn-icon--blue" type="button" title="Refresh" aria-label="Refresh employees list"
                    onClick={() => setReload(r => r + 1)} disabled={loading}>
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        {/* Table */}
        <table className="table" aria-label="Employees table">
          <thead>
            <tr>
              {(['fullName','position','salary','branch'] as const).map(k => (
                <th key={k} aria-sort={sortKey===k ? (sortDir==='asc' ? 'ascending' : sortDir==='desc' ? 'descending' : 'none') : 'none'}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleSort(k)} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontWeight:700 }}>
                      {k==='fullName'?'Name':k[0].toUpperCase()+k.slice(1)}
                    </span>
                    {renderSortIcon(k)}
                  </button>
                </th>
              ))}
              <th style={{width:120}}>Actions</th>
            </tr>
            {/* per-column filters */}
            <tr className="filter-row">
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Search by Name" value={nameFilter} onChange={e=>{ setNameFilter(e.target.value); setPage(0); }} />
                    {nameFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setNameFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Search by Position" value={positionFilter} onChange={e=>{ setPositionFilter(e.target.value); setPage(0); }} />
                    {positionFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setPositionFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Search by Salary" value={salaryFilter} onChange={e=>{ setSalaryFilter(e.target.value); setPage(0); }} />
                    {salaryFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setSalaryFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Search by Branch" value={branchFilter} onChange={e=>{ setBranchFilter(e.target.value); setPage(0); }} />
                    {branchFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setBranchFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="helper">No records found</div>
                </td>
              </tr>
            )}
            {paged.map((emp: ApiEmployee) => (
              <tr key={emp.id} title={(emp as any).createdAt ? 'Created: ' + new Date((emp as any).createdAt).toLocaleString(undefined,{dateStyle:'medium', timeStyle:'short'}) : undefined}>
                <td className="linkish">
                  {emp.fullName}
                  {(emp as any).createdAt && (
                    <span className="helper" style={{ marginLeft:4, fontSize:'0.65em', opacity:0.7 }}>
                      • {new Date((emp as any).createdAt).toLocaleDateString()}
                    </span>
                  )}
                </td>
                <td>{emp.position}</td>
                <td>{(emp as any).salary}</td>
                <td>{emp.branch?.id?.slice(0,8)}</td>
                <td>
                  <div className="action-buttons">
                    {!archivedMode ? (
                      <>
                        <button className="btn-icon btn-icon--blue" title="Edit" aria-label="Edit employee" onClick={() => openEdit(emp)}>
                          <Icon name="pencil" />
                        </button>
                        <button className="btn-icon btn-icon--red" title="Archive" aria-label="Archive employee" onClick={() => onArchive(emp)}>
                          <Icon name="trash" />
                        </button>
                      </>
                    ) : (
                      isAdmin && (
                        <button className="btn-icon btn-icon--blue" title="Restore" aria-label="Restore employee" onClick={() => onRestore(emp)}>
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
          <div className="footbar-right" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
            <span className="helper" aria-live="polite" style={{ whiteSpace:'nowrap' }}>
              {filtered.length === 0 ? 'No records found' : `Showing ${filtered.length === 0 ? 0 : (page*pageSize + 1)}–${Math.min(filtered.length, (page*pageSize) + paged.length)} of ${filtered.length}`}
            </span>
            {isAdmin && (
              <label
                className="switch-sm switch-rounded"
                title={archivedMode ? 'Currently viewing archived employees. Click to show active employees.' : 'Currently viewing active employees. Click to show archived employees.'}
              >
                <input
                  type="checkbox"
                  checked={archivedMode}
                  onChange={e => { setArchivedMode(e.target.checked); setPage(0) }}
                  aria-label={archivedMode ? 'Showing archived employees (toggle to show active)' : 'Showing active employees (toggle to show archived)'}
                />
                <span className="label">{archivedMode ? 'Showing archived' : 'Show archived'}</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.action === 'archive' ? 'Archive employee' : 'Restore employee'}
          message={<span>Are you sure you want to {confirm.action} <strong>{confirm.emp.fullName}</strong>?</span>}
          busy={confirm.busy}
          onCancel={() => setConfirm(null)}
          onConfirm={confirmAction}
          confirmLabel={confirm.action === 'archive' ? (confirm.busy ? 'Archiving…' : 'Archive') : (confirm.busy ? 'Restoring…' : 'Restore')}
          confirmStyle={confirm.action === 'archive' ? 'danger' : 'primary'}
        />
      )}

  {/* Create Modal */}
      {createOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => { if(!submitting) closeCreate() }}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-employee-title"
            onClick={e=> e.stopPropagation()}
            data-employee-modal="true"
          >
            <div className="modal-head">
              <strong id="create-employee-title">Add employee</strong>
              <button type="button" className="chip-x" aria-label="Close" onClick={closeCreate} disabled={submitting}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e)=>{ e.preventDefault(); submit() }} className="form-modern" noValidate aria-describedby={(submitted && Object.keys(errors).length)? 'create-error-summary': undefined}>
                <EmployeeFormFields idPrefix="create" form={form} setForm={setForm} errors={errors} touched={touched} submitted={submitted} validateAndSet={validateAndSet} filteredDepartments={filteredDepartments} branches={branches} departments={departments} firstErrorRef={firstErrorRef} />
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-secondary" onClick={closeCreate} disabled={submitting}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={submitting}>{submitting? 'Saving…' : 'Save employee'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

  {/* Edit Modal */}
      {editOpen && editForm && (
        <div className="modal-backdrop" role="presentation" onClick={() => { if(!editSubmitting) closeEdit() }}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-employee-title"
            onClick={e=> e.stopPropagation()}
            data-employee-modal="true"
          >
            <div className="modal-head">
              <strong id="edit-employee-title">Edit employee</strong>
              <button type="button" className="chip-x" aria-label="Close" onClick={closeEdit} disabled={editSubmitting}>×</button>
            </div>
            <div className="modal-body">
              <EditEmployeeForm form={editForm} setForm={setEditForm} errors={editErrors} setErrors={setEditErrors} touched={editTouched} setTouched={setEditTouched} submitting={editSubmitting} setSubmitting={setEditSubmitting} employeeId={editingEmployeeId!} onClose={closeEdit} branches={branches} departments={departments} onUpdated={(updated)=> setEmployees(list=> list.map(e=> e.id===updated.id? updated: e))} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Shared fields component for create & edit to reduce duplication
const EmployeeFormFields: React.FC<{
  idPrefix: string
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  errors: Errors
  touched: Partial<Record<keyof FormState, boolean>>
  submitted: boolean
  validateAndSet: (field?: keyof FormState) => Errors
  filteredDepartments: Department[]
  branches: Branch[]
  departments: Department[]
  firstErrorRef?: React.MutableRefObject<HTMLInputElement | null>
}> = ({ idPrefix, form, setForm, errors, touched, submitted, validateAndSet, filteredDepartments, branches, firstErrorRef }) => {
  const FIELD_LABELS: Record<keyof FormState, string> = {
    fullName: 'Full name', dob: 'Date of birth', position: 'Position', salary: 'Salary', address: 'Address', phone: 'Phone', email: 'Email', departmentId: 'Department', branchId: 'Branch', bankName: 'Bank name', bankAccount: 'Account number', startDate: 'Start date', endDate: 'End date'
  }
  function localFormatPhone() {
    if (!form.phone) return
    const raw = form.phone.trim(); const hadPlus = raw.startsWith('+'); const digits = raw.replace(/\D/g,'')
    let formatted = form.phone
    if (hadPlus && digits.startsWith('2507') && digits.length === 12) {
      const tail = digits.slice(3)
      formatted = `+250 ${tail.slice(0,3)} ${tail.slice(3,6)} ${tail.slice(6,9)}`
    } else if (!hadPlus && digits.startsWith('07') && digits.length === 10) {
      formatted = `${digits.slice(0,4)} ${digits.slice(4,7)} ${digits.slice(7,10)}`
    } else { formatted = (hadPlus? '+':'') + digits }
    setForm(f=> ({ ...f, phone: formatted }))
  }
  const showSummary = submitted && Object.keys(errors).length > 0
  const orderedKeys: (keyof FormState)[] = ['fullName','dob','position','salary','address','phone','email','departmentId','branchId','bankName','bankAccount','startDate','endDate']
  const summaryNames = orderedKeys.filter(k=> (errors as any)[k]).map(k=> FIELD_LABELS[k])
  return (
    <div>
      {showSummary && summaryNames.length > 0 && (
        <div id={`${idPrefix}-error-summary`} className="error" role="alert" style={{marginBottom:8}}>
          {`Please fix: ${summaryNames.join(', ')}.`}
        </div>
      )}
      <div className="form-2col">
        <div className="field-stack">
          <Field id={`${idPrefix}-fullName`} label="Full name" required error={submitted||touched.fullName?errors.fullName:undefined}>
            <input id={`${idPrefix}-fullName`} ref={el=>{ if(firstErrorRef && !firstErrorRef.current && errors.fullName) firstErrorRef.current = el }} value={form.fullName} placeholder="Enter full name" onBlur={()=>{ const v=validateAndSet('fullName'); if(!v.fullName) setForm(f=>f) }} onChange={e=>{ setForm(f=>({...f, fullName:e.target.value})); if(submitted) validateAndSet('fullName') }} />
          </Field>
          <Field id={`${idPrefix}-dob`} label={<span style={{display:'inline-flex', alignItems:'center', gap:6}}>Date of birth <InfoIcon text="Must be 18+ (Format: YYYY-MM-DD)" /></span>} required error={submitted||touched.dob?errors.dob:undefined}>
            <DatePicker id={`${idPrefix}-dob`} name="dob" value={form.dob} unbounded defaultViewDate={new Date(new Date().getFullYear()-18, new Date().getMonth(), 1)} onChange={v=>{ setForm(f=>({...f, dob:v})); if(submitted) validateAndSet('dob') }} />
          </Field>
          <Field id={`${idPrefix}-phone`} label={<span style={{display:'inline-flex', alignItems:'center', gap:6}}>Phone <InfoIcon text="Rwanda format: +2507XXXXXXXX (9 digits)" /></span>} error={submitted||touched.phone?errors.phone:undefined}>
            <PhoneInput id={`${idPrefix}-phone`} value={form.phone} onChange={v=>{ setForm(f=>({...f, phone:v})); if(submitted) validateAndSet('phone') }} onBlur={()=>{ const v=validateAndSet('phone'); if(!v.phone) setForm(f=>f) }} noInlineValidation placeholder="+2507XXXXXXXX" />
          </Field>
          <Field id={`${idPrefix}-email`} label="Email" error={submitted||touched.email?errors.email:undefined}>
            <input id={`${idPrefix}-email`} value={form.email} placeholder="Optional" onBlur={()=>{ const v=validateAndSet('email'); if(!v.email) setForm(f=>f) }} onChange={e=>{ setForm(f=>({...f, email:e.target.value})); if(submitted) validateAndSet('email') }} />
          </Field>
        </div>
        <div className="field-stack">
          <Field id={`${idPrefix}-address`} label="Address" required error={submitted||touched.address?errors.address:undefined}>
            <input id={`${idPrefix}-address`} value={form.address} placeholder="Enter address" onBlur={()=>{ const v=validateAndSet('address'); if(!v.address) setForm(f=>f) }} onChange={e=>{ setForm(f=>({...f, address:e.target.value})); if(submitted) validateAndSet('address') }} />
          </Field>
          <Field id={`${idPrefix}-branchId`} label="Branch" required error={submitted||touched.branchId?errors.branchId:undefined}>
            <select id={`${idPrefix}-branchId`} value={form.branchId} onChange={e=>{ const newBranchId = (e.target as HTMLSelectElement).value; setForm(f=>({ ...f, branchId:newBranchId, departmentId: f.departmentId && filteredDepartments.find(d=>d.id===f.departmentId && (d.branchId? d.branchId===newBranchId : true)) ? f.departmentId : '' })); if(submitted){ validateAndSet('branchId'); validateAndSet('departmentId') } }}>
              <option value="">Select branch…</option>
              {branches.map(b=> <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field id={`${idPrefix}-departmentId`} label="Department" required error={submitted||touched.departmentId?errors.departmentId:undefined}>
            <select id={`${idPrefix}-departmentId`} value={form.departmentId} disabled={!form.branchId} onChange={e=>{ setForm(f=>({...f, departmentId:(e.target as HTMLSelectElement).value})); if(submitted) validateAndSet('departmentId') }}>
              <option value="">{form.branchId? 'Select department…':'Select branch first'}</option>
              {filteredDepartments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <div className="form-2col" style={{marginTop:12}}>
        <div className="field-stack">
          <Field id={`${idPrefix}-position`} label="Position" required error={submitted||touched.position?errors.position:undefined}>
            <input id={`${idPrefix}-position`} value={form.position} placeholder="Enter position" onBlur={()=>{ const v=validateAndSet('position'); if(!v.position) setForm(f=>f) }} onChange={e=>{ setForm(f=>({...f, position:e.target.value})); if(submitted) validateAndSet('position') }} />
          </Field>
          <Field id={`${idPrefix}-salary`} label="Salary" required error={submitted||touched.salary?errors.salary:undefined}>
            <input id={`${idPrefix}-salary`} type="number" value={form.salary} placeholder="0" onBlur={()=>{ const v=validateAndSet('salary'); if(!v.salary) setForm(f=>f) }} onChange={e=>{ setForm(f=>({...f, salary:e.target.value})); if(submitted) validateAndSet('salary') }} />
          </Field>
            <Field id={`${idPrefix}-startDate`} label="Start date" error={submitted||touched.startDate?errors.startDate:undefined}>
              <DatePicker id={`${idPrefix}-startDate`} name="startDate" value={form.startDate} unbounded onChange={v=>{ setForm(f=>({...f, startDate:v})); if(submitted) validateAndSet('startDate') }} />
            </Field>
            <Field id={`${idPrefix}-endDate`} label="End date" error={submitted||touched.endDate?errors.endDate:undefined}>
              <DatePicker id={`${idPrefix}-endDate`} name="endDate" value={form.endDate} unbounded defaultViewDate={form.startDate ? new Date(Number(form.startDate.slice(0,4)), Number(form.startDate.slice(5,7)) - 1, 1) : undefined} onChange={v=>{ setForm(f=>({...f, endDate:v})); if(submitted) validateAndSet('endDate') }} />
            </Field>
        </div>
        <div className="field-stack">
          <Field id={`${idPrefix}-bankName`} label="Bank name" error={submitted||touched.bankName?errors.bankName:undefined}>
            <select id={`${idPrefix}-bankName`} value={form.bankName} onChange={e=>{ setForm(f=>({...f, bankName:(e.target as HTMLSelectElement).value})); if(submitted) validateAndSet('bankName') }}>
              <option value="">Select bank…</option>
              {RWANDA_BANKS.map(b=> <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </Field>
          <Field id={`${idPrefix}-bankAccount`} label="Account number" error={submitted||touched.bankAccount?errors.bankAccount:undefined}>
            <input id={`${idPrefix}-bankAccount`} value={form.bankAccount} placeholder="e.g. 1234567890123" onChange={e=>{ setForm(f=>({...f, bankAccount:e.target.value})); if(submitted) validateAndSet('bankAccount') }} />
          </Field>
        </div>
      </div>
    </div>
  )
}

// Separate component for edit form to isolate IDs and state and handle server errors
const EditEmployeeForm: React.FC<{
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState | null>>
  errors: Errors
  setErrors: React.Dispatch<React.SetStateAction<Errors>>
  touched: Partial<Record<keyof FormState, boolean>>
  setTouched: React.Dispatch<React.SetStateAction<Partial<Record<keyof FormState, boolean>>>>
  submitting: boolean
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  employeeId: string
  onClose: () => void
  branches: Branch[]
  departments: Department[]
  onUpdated: (e: any) => void
}> = ({ form, setForm, errors, setErrors, touched, setTouched, submitting, setSubmitting, employeeId, onClose, branches, departments, onUpdated }) => {
  const toast = useToast()
  const [submitted, setSubmitted] = useState(false)
  const filteredDepartments = useMemo(() => {
    if (!form?.branchId) return [] as Department[]
    return departments.filter(d => !d.branchId || d.branchId === form.branchId)
  }, [departments, form?.branchId])
  // focus first input on open
  const firstInputRef = useRef<HTMLInputElement | null>(null)
  useEffect(()=>{ if(firstInputRef.current) firstInputRef.current.focus() }, [])

  function validateAndSet(field?: keyof FormState) {
    if (!form) return {}
    const v = validateForm(form)
    setErrors(v)
    if (field) setTouched(t => ({ ...t, [field]: true }))
    return v
  }

  async function submitEdit() {
    if (!form) return
    setSubmitted(true)
    const v = validateAndSet()
    if (Object.keys(v).length) return
    setSubmitting(true)
    const payload: ApiEmployeePayload = {
      fullName: form.fullName.trim(),
      dob: form.dob,
      position: form.position.trim(),
      salary: Number(form.salary),
      address: form.address.trim(),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      bankName: form.bankName || undefined,
      bankAccount: form.bankAccount ? form.bankAccount.replace(/\s+/g,'') : undefined,
      department: { id: form.departmentId },
      branch: { id: form.branchId }
    }
    try {
      const updated = await updateEmployee(employeeId, payload)
      toast.show('Employee updated', 'success')
      onUpdated(updated)
      onClose()
      // optimistic strategy: no direct access to parent employees list here; rely on user refresh or we could dispatch a custom event.
    } catch (e: any) {
      const err = e as any
      // server field errors mapping similar to create flow
      let hadFieldErrors = false
      const srvDetails = err?.details
      if (srvDetails) {
        const next: Partial<Errors> = {}
        try {
          if (Array.isArray(srvDetails)) {
            for (const it of srvDetails) {
              if (it && typeof it === 'object') {
                const f = String((it as any).field || '') as keyof FormState
                const m = String((it as any).message || '')
                if (f && m && (f in form)) { next[f] = m; hadFieldErrors = true }
              }
            }
          } else if (typeof srvDetails === 'object') {
            for (const k of Object.keys(srvDetails)) {
              const f = k as keyof FormState
              const m = String((srvDetails as any)[k])
              if (f && m && (f in form)) { next[f] = m; hadFieldErrors = true }
            }
          }
        } catch {}
        if (hadFieldErrors) {
          setErrors(prev => ({ ...prev, ...next }))
          setSubmitted(true)
        }
      }
      let msg: string | undefined
      if (err instanceof ApiError && err.status === 401) msg = 'Your session has expired. Please sign in and try again.'
      else if (err instanceof ApiError && err.status === 403) msg = 'You do not have permission to perform this action.'
      else if (hadFieldErrors) {
        const names = Object.keys(errors).filter(k=> (errors as any)[k]).join(', ')
        msg = names.length? `Please fix: ${names}.` : 'Please fix form errors.'
      } else if (err instanceof ApiError) {
        const isServer = err.status >= 500 && err.status < 600
        const generic = !err.message || /^(unexpected error|internal server error)$/i.test(err.message)
        let base: string
        if (err.status === 404) base = 'Service unavailable right now.'
        else if (err.status === 409 || String(err.code).toUpperCase().includes('DUPLICATE')) base = 'An employee with similar details already exists.'
        else if (err.status === 400 || err.status === 422) base = 'Please review and correct the highlighted fields.'
        else if (isServer || generic || err.code === 'INTERNAL_ERROR') base = 'Something went wrong while updating the employee.'
        else base = err.message || 'Request failed'
        const extras = [err.status? `HTTP ${err.status}`:null, err.code? `Code ${err.code}`:null, err.traceId? `Trace ${err.traceId}`:null].filter(Boolean)
        msg = extras.length? `${base} (${extras.join(', ')})` : base
      } else msg = err?.message || 'Update failed'
      if (msg) toast.show(msg, 'error')
    } finally { setSubmitting(false) }
  }

  if (!form) return null
  return (
  <form onSubmit={e=>{ e.preventDefault(); submitEdit() }} className="form-modern" noValidate aria-describedby={(submitted && Object.keys(errors).length)? 'edit-error-summary': undefined}>
      <EmployeeFormFields
        idPrefix="edit"
        form={form}
        setForm={(f)=> setForm(f as any)}
        errors={errors}
        touched={touched}
        submitted={submitted}
        validateAndSet={validateAndSet}
        filteredDepartments={filteredDepartments}
        branches={branches}
        departments={departments}
      />
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Updating…' : 'Update employee'}</button>
      </div>
    </form>
  )
}

export default EmployeesPage
