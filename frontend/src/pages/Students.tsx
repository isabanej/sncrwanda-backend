import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { MSG } from '../lib/messages'
import { validateStudent, validateStudentField } from '../lib/validation'
import { DatePicker } from '../lib/ui/DatePicker'
import ConfirmModal from '../components/shared/ConfirmModal'
import { Icon } from '../components/Icon'

type UUID = string

interface Student { id: UUID; guardianId: UUID; childName: string; childDob: string; hobbies?: string; needs?: string[]; needsOtherText?: string | null; archived?: boolean; createdAt?: string }
interface Guardian { id: UUID; fullName: string }
interface FormState { guardianId: UUID | ''; childName: string; childDob: string; hobbies: string; needs: string[]; needsOtherText: string }
interface NeedOption { code: string; label: string; color: string }
// Dynamic need options loaded from backend /students/needs
const NEED_LABEL: Record<string,string> = {}
const NEED_COLOR: Record<string,string> = {}
// Fallback static list so users see options instantly (codes must match backend enum)
const FALLBACK_NEEDS_CODES = [
  'PHYSICAL',
  'LEARNING',
  'SPEECH_LANGUAGE',
  'MENTAL_EMOTIONAL_HEALTH',
  'SOCIAL_COMMUNICATION_AUTISM',
  'MOBILITY',
  'HEARING',
  'OTHER'
]

function escapeRegExp(str: string) { return str.replace(/[.*+?^${}()|[\]\\]/g, r => `\\${r}`) }
function highlight(text: string, query: string) {
  if (!query) return text
  try {
    const rx = new RegExp(`(${escapeRegExp(query)})`, 'ig')
    const parts = text.split(rx)
    return parts.map((p,i) => rx.test(p) ? <mark key={i} style={{ background:'#fde047', padding:0 }}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>)
  } catch { return text }
}
const emptyForm: FormState = { guardianId: '', childName: '', childDob: '', hobbies: '', needs: [], needsOtherText: '' }

// Utility helpers for hobbies management
function normalizeHobby(h: string): string {
  const t = h.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return t.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
function parseHobbies(raw: string): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  raw.split(/[\n,]/).map(r => normalizeHobby(r)).forEach(h => {
    if (h && !seen.has(h.toLowerCase())) { seen.add(h.toLowerCase()); out.push(h) }
  })
  return out
}

// Deterministic hobby color mapping (hash to palette)
const HOBBY_PALETTE = ['#1d4ed8','#9333ea','#db2777','#059669','#0d9488','#ea580c','#7c3aed','#16a34a','#be123c','#0369a1']
function hobbyColor(name: string): string {
  let h = 0; for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return HOBBY_PALETTE[h % HOBBY_PALETTE.length]
}

// Need color palette distinct from hobbies for clearer visual separation
const NEED_PALETTE = ['#065f46','#065a60','#7c2d12','#5b21b6','#4d7c0f','#9d174d','#1e3a8a','#78350f','#374151','#047857']
function needColor(code: string): string {
  if (NEED_COLOR[code]) return NEED_COLOR[code]
  let h = 0; for (let i=0;i<code.length;i++) h = (h*41 + code.charCodeAt(i)) >>> 0;
  return NEED_PALETTE[h % NEED_PALETTE.length]
}

type ModalState = { mode: 'create'|'edit'; busy?: boolean; id?: UUID; form: FormState; errors: Partial<Record<keyof FormState, string>>; hobbyList: string[]; hobbyDraft: string }

const Students: React.FC = () => {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isAdmin = !!user?.roles?.some(r => r === 'ADMIN' || r === 'SUPER_ADMIN')

  const [students, setStudents] = useState<Student[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [needOptions, setNeedOptions] = useState<NeedOption[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reload, setReload] = useState(0)

  const [modal, setModal] = useState<null | ModalState>(null)
  const [confirm, setConfirm] = useState<null | { mode: 'delete'|'restore'; stu: Student; busy?: boolean }>(null)
  const [dialog, setDialog] = useState<null | { title: string; message: string; type: 'success'|'error'; restoreId?: UUID }>(null)
  // Global quick filter (toolbar) + per-column filters
  const [filter, setFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [dobFilter, setDobFilter] = useState('')
  const [guardianFilter, setGuardianFilter] = useState('')
  const [hobbiesFilter, setHobbiesFilter] = useState('')
  const [needsFilter, setNeedsFilter] = useState('')
  // Sorting
  const [sortKey, setSortKey] = useState<null | 'name' | 'dob' | 'guardian' | 'hobbies' | 'needs'>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => { (async () => {
    setLoading(true)
    try {
      const url = showArchived ? '/students?archived=true' : '/students'
      const fb = showArchived ? '/_student/students?archived=true' : '/_student/students'
      const list = await api.get<Student[]>(url, token).catch(async e => {
        if (e instanceof ApiError && [0,502,503,504].includes(e.status)) { try { return await api.get<Student[]>(fb, token) } catch { return [] } }
        try { return await api.get<Student[]>(fb, token) } catch { return [] }
      })
      const gs = await api.get<Guardian[]>('/students/guardians', token).catch(async e => {
        if (e instanceof ApiError && [0,502,503,504].includes(e.status)) { try { return await api.get<Guardian[]>('/_student/students/guardians', token) } catch { return [] } }
        try { return await api.get<Guardian[]>('/_student/students/guardians', token) } catch { return [] }
      })
      // Load need options dynamically
      const needs = await api.get<NeedOption[]>('/students/needs', token).catch(async e => {
        if (e instanceof ApiError && [0,502,503,504].includes(e.status)) { try { return await api.get<NeedOption[]>('/_student/students/needs', token) } catch { return [] } }
        try { return await api.get<NeedOption[]>('/_student/students/needs', token) } catch { return [] }
      })
      if (needs.length) {
        // update label/color maps
        needs.forEach(n => { NEED_LABEL[n.code] = n.label; NEED_COLOR[n.code] = n.color })
        setNeedOptions(needs)
        try { localStorage.setItem('students.needOptions', JSON.stringify(needs)) } catch { /* ignore */ }
      }
      setStudents(list)
      setGuardians(gs)
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { toast.show(MSG.sessionExpired, 'error'); logout(); navigate('/login', { replace:true }); return }
      toast.show(e?.message || 'Failed to load students', 'error')
    } finally { setLoading(false) }
  })() }, [token, showArchived, reload])

  // Ensure need options are present when opening modal quickly before initial load completes
  useEffect(() => {
    if (modal && needOptions.length === 0) {
      (async () => {
        try {
          // First attempt to restore from cache instantly
          try {
            const cached = localStorage.getItem('students.needOptions')
            if (cached) {
              const arr: NeedOption[] = JSON.parse(cached)
              if (Array.isArray(arr) && arr.length) {
                arr.forEach(n => { NEED_LABEL[n.code] = n.label; NEED_COLOR[n.code] = n.color })
                setNeedOptions(arr)
              }
            }
          } catch { /* ignore */ }
          const needs = await api.get<NeedOption[]>('/students/needs', token).catch(async e => {
            if (e instanceof ApiError && [0,502,503,504].includes(e.status)) { try { return await api.get<NeedOption[]>('/_student/students/needs', token) } catch { return [] } }
            try { return await api.get<NeedOption[]>('/_student/students/needs', token) } catch { return [] }
          })
          if (needs.length) {
            needs.forEach(n => { NEED_LABEL[n.code] = n.label; NEED_COLOR[n.code] = n.color })
            setNeedOptions(needs)
            try { localStorage.setItem('students.needOptions', JSON.stringify(needs)) } catch { /* ignore */ }
          }
        } catch { /* silent */ }
      })()
    }
  }, [modal, needOptions.length, token])

  // Preload need options from cache on mount if empty (before remote fetch completes)
  useEffect(() => {
    if (needOptions.length === 0) {
      try {
        const cached = localStorage.getItem('students.needOptions')
        if (cached) {
          const arr: NeedOption[] = JSON.parse(cached)
          if (Array.isArray(arr) && arr.length) {
            arr.forEach(n => { NEED_LABEL[n.code] = n.label; NEED_COLOR[n.code] = n.color })
            setNeedOptions(arr)
          }
        }
      } catch { /* ignore */ }
    }
  }, [needOptions.length])

  const guardianMap = useMemo(() => Object.fromEntries(guardians.map(g => [g.id, g.fullName])), [guardians])
  const baseFiltered = useMemo(() => {
    const gl = filter.trim().toLowerCase()
    const nf = nameFilter.trim().toLowerCase()
    const df = dobFilter.trim().toLowerCase()
    const gf = guardianFilter.trim().toLowerCase()
    const hf = hobbiesFilter.trim().toLowerCase()
    const nfilt = needsFilter.trim().toLowerCase()
    return students.filter(s => {
      const gName = guardianMap[s.guardianId] || s.guardianId || ''
      const matchesGlobal = !gl || [s.childName, s.childDob, gName].some(v => (v||'').toLowerCase().includes(gl))
      if (!matchesGlobal) return false
      if (nf && !s.childName.toLowerCase().includes(nf)) return false
      if (df && !(s.childDob||'').toLowerCase().includes(df)) return false
      if (gf && !gName.toLowerCase().includes(gf)) return false
      if (hf) {
        const hobbyText = (s.hobbies||'').toLowerCase().replace(/\n/g, ',')
        if (!hobbyText.includes(hf)) return false
      }
      if (nfilt) {
        const needsCodes = (s.needs||[])
        const needsText = needsCodes.map(c => (NEED_LABEL[c]||c).toLowerCase()).join(',')
        if (!needsText.includes(nfilt)) return false
      }
      return true
    })
  }, [students, filter, nameFilter, dobFilter, guardianFilter, hobbiesFilter, needsFilter, guardianMap])

  function toggleSort(key: 'name' | 'dob' | 'guardian' | 'hobbies' | 'needs') {
    setSortKey(k => {
      if (k !== key) { setSortDir('asc'); return key }
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
      return key
    })
    setPage(0)
  }

  const sorted = useMemo(() => {
    if (!sortKey) return baseFiltered
    const arr = [...baseFiltered]
    const cmp = (a: Student, b: Student) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'name') return a.childName.localeCompare(b.childName) * mul
      if (sortKey === 'dob') return (a.childDob||'').localeCompare(b.childDob||'') * mul
      if (sortKey === 'guardian') {
        const ga = (guardianMap[a.guardianId] || '').toString()
        const gb = (guardianMap[b.guardianId] || '').toString()
        return ga.localeCompare(gb) * mul
      }
      if (sortKey === 'hobbies') {
        const ha = (a.hobbies||'').replace(/\n/g, ',')
        const hb = (b.hobbies||'').replace(/\n/g, ',')
        return ha.localeCompare(hb) * mul
      }
      if (sortKey === 'needs') {
        const na = (a.needs||[]).join(',')
        const nb = (b.needs||[]).join(',')
        return na.localeCompare(nb) * mul
      }
      return 0
    }
    arr.sort(cmp)
    return arr
  }, [baseFiltered, sortKey, sortDir, guardianMap])

  // Pagination state (client-side)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / pageSize)), [sorted.length, pageSize])
  const paged = useMemo(() => sorted.slice(page * pageSize, page * pageSize + pageSize), [sorted, page, pageSize])

  // Reset or clamp page when filters/data change
  useEffect(() => { setPage(0) }, [filter, nameFilter, dobFilter, guardianFilter, hobbiesFilter, needsFilter, showArchived])
  useEffect(() => { if (page >= totalPages) setPage(0) }, [totalPages, page])

  // Persist page size & showArchived in localStorage
  useEffect(() => {
    try {
      const ps = localStorage.getItem('students.pageSize')
      if (ps) { const n = parseInt(ps); if (!isNaN(n)) setPageSize(n) }
      const arch = localStorage.getItem('students.showArchived')
      if (arch) setShowArchived(arch === '1')
    } catch { /* ignore */ }
  }, [])
  useEffect(() => { try { localStorage.setItem('students.pageSize', String(pageSize)) } catch { /* ignore */ } }, [pageSize])
  useEffect(() => { try { localStorage.setItem('students.showArchived', showArchived ? '1':'0') } catch { /* ignore */ } }, [showArchived])

  function openCreate() { setModal({ mode: 'create', form: { ...emptyForm }, errors: {}, hobbyList: [], hobbyDraft: '' }) }
  function openEdit(s: Student) {
    const raw = s.hobbies || ''
    const list = parseHobbies(raw)
    setModal({ mode: 'edit', id: s.id, form: { guardianId: s.guardianId, childName: s.childName||'', childDob: s.childDob||'', hobbies: raw, needs: s.needs||[], needsOtherText: s.needsOtherText||''}, errors: {}, hobbyList: list, hobbyDraft: '' })
  }
  // Soft delete represented to users as 'Archive'
  function openDelete(s: Student) { setConfirm({ mode: 'delete', stu: s }) }
  function openRestore(s: Student) { setConfirm({ mode: 'restore', stu: s }) }

  function onFormChange<K extends keyof FormState>(k: K, v: string | string[]) {
    if (!modal) return
    const value: any = v
    const next = { ...modal.form, [k]: value }
    const err = validateStudentField(k as any, value as any)
    setModal(m => m ? { ...m, form: next, errors: { ...m.errors, [k]: err || undefined } } : m)
  }
  function toggleNeed(opt: string) {
    if (!modal) return
    const has = modal.form.needs.includes(opt)
    const needs = has ? modal.form.needs.filter(x => x!==opt) : [...modal.form.needs, opt]
    onFormChange('needs', needs)
  }

  function syncHobbiesToForm(list: string[]) {
    setModal(m => m ? { ...m, form: { ...m.form, hobbies: list.join('\n') } } : m)
  }
  function addHobby() {
    if (!modal) return
    const entries = modal.hobbyDraft.split(/[\n,]/).map(e => normalizeHobby(e)).filter(Boolean)
    if (!entries.length) return
    const existingLower = new Set(modal.hobbyList.map(h => h.toLowerCase()))
    const added: string[] = []
    entries.forEach(h => { if (!existingLower.has(h.toLowerCase())) { existingLower.add(h.toLowerCase()); added.push(h) } })
    if (added.length === 0) { toast.show('Hobby already added', 'error'); return }
    const list = [...modal.hobbyList, ...added]
    setModal(m => m ? { ...m, hobbyList: list, hobbyDraft: '' } : m)
    syncHobbiesToForm(list)
  }
  function removeHobby(h: string) {
    if (!modal) return
    const list = modal.hobbyList.filter(x => x !== h)
    setModal(m => m ? { ...m, hobbyList: list } : m)
    syncHobbiesToForm(list)
  }

  async function saveModal() {
    if (!modal) return
    const validation = validateStudent(modal.form)
    if (!validation.valid) { setModal(m => m ? { ...m, errors: { ...m.errors, ...validation.errors } } : m); toast.show(MSG.fixFields, 'error'); return }
    setModal(m => m ? { ...m, busy: true } : m)
    try {
      const payload = {
        guardianId: modal.form.guardianId,
        childName: modal.form.childName.trim(),
        childDob: modal.form.childDob,
        hobbies: modal.hobbyList.length ? modal.hobbyList.join('\n') : undefined,
  needs: modal.form.needs.length ? modal.form.needs : undefined,
        needsOtherText: modal.form.needsOtherText.trim() || undefined
      }
      if (modal.mode === 'edit' && modal.id) {
        const updated = await api.put<Student>(`/students/${modal.id}`, payload, token)
        setStudents(s => s.map(x => x.id === modal.id ? updated : x))
        setDialog({ type: 'success', title: 'Updated', message: 'Student updated successfully!' })
      } else {
        let created: Student
        try { created = await api.post<Student>('/students', payload, token) }
        catch (e: any) {
          if (e instanceof ApiError && e.status === 409) { setDialog({ type: 'error', title: 'Duplicate', message: 'A student with those details already exists.' }); return }
          throw e
        }
        if (!created.createdAt) created.createdAt = new Date().toISOString()
        setStudents(s => [created, ...s])
        setDialog({ type: 'success', title: 'Registered', message: 'Student registered successfully!!!' })
      }
      setModal(null)
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { toast.show(MSG.sessionExpired, 'error'); logout(); navigate('/login',{replace:true}); return }
      toast.show(e?.message || 'Request failed', 'error')
    } finally { setModal(m => m ? { ...m, busy: false } : m) }
  }

  async function confirmAction() {
    if (!confirm) return
    setConfirm(c => c ? { ...c, busy: true } : c)
    try {
      if (confirm.mode === 'delete') {
        try { await api.delete(`/students/${confirm.stu.id}`, token) }
        catch (e: any) {
          if (e instanceof ApiError && (e.status === 404 || [0,502,503,504].includes(e.status))) { await api.delete(`/_student/students/${confirm.stu.id}`, token) } else throw e
        }
        setStudents(s => s.filter(x => x.id !== confirm.stu.id))
  toast.show('Student archived', 'success')
      } else {
        try { await api.post(`/students/${confirm.stu.id}/restore`, {}, token) }
        catch (e: any) {
          if (e instanceof ApiError && (e.status === 404 || [0,502,503,504].includes(e.status))) { await api.post(`/_student/students/${confirm.stu.id}/restore`, {}, token) } else throw e
        }
        toast.show('Student restored', 'success')
        setReload(r => r+1)
      }
      setConfirm(null)
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { toast.show(MSG.sessionExpired,'error'); logout(); navigate('/login',{replace:true}); return }
      toast.show(e?.message || 'Action failed', 'error')
    } finally { setConfirm(c => c ? { ...c, busy: false } : c) }
  }

  return (
    <div className="p-4 space-y-4" aria-label="Students">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Students</h2>
        <div className="table-toolbar">
          <div className="toolbar-left" style={{ gap: 8 }}>
            <button className="btn btn-primary" type="button" onClick={openCreate}>Add student</button>
            <span>Show</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} aria-label="Results per page">
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>result per page</span>
          </div>
          <div className="toolbar-right" style={{ gap: 6 }}>
            <input className="input-search" aria-label="Filter students" placeholder="Filter in records..." value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} />
            {filter && (
              <button className="btn-icon btn-icon--blue" type="button" title="Clear filter" aria-label="Clear filter" onClick={() => { setFilter(''); setPage(0) }}>
                <Icon name="x" />
              </button>
            )}
            <button className="btn-icon btn-icon--blue" type="button" title="Refresh" aria-label="Refresh students list" onClick={() => setReload(r => r + 1)} disabled={loading}>
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        <table className="table" aria-label="Students table">
          <thead>
            <tr>
              {[
                { key:'name', label:'Name' },
                { key:'dob', label:'DOB' },
                { key:'guardian', label:'Guardian' },
                { key:'hobbies', label:'Hobbies' },
                { key:'needs', label:'Needs' }
              ].map(col => (
                <th key={col.key} aria-sort={sortKey===col.key ? (sortDir==='asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleSort(col.key as any)} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontWeight:700 }}>{col.label}</span>
                    {sortKey!==col.key && <Icon name="sort" />}
                    {sortKey===col.key && sortDir==='asc' && <Icon name="sortAsc" />}
                    {sortKey===col.key && sortDir==='desc' && <Icon name="sortDesc" />}
                  </button>
                </th>
              ))}
              <th style={{width:140}}>Actions</th>
            </tr>
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
                    <input placeholder="Search by DOB" value={dobFilter} onChange={e=>{ setDobFilter(e.target.value); setPage(0); }} />
                    {dobFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setDobFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Search by Guardian" value={guardianFilter} onChange={e=>{ setGuardianFilter(e.target.value); setPage(0); }} />
                    {guardianFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setGuardianFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Search by Hobbies" value={hobbiesFilter} onChange={e=>{ setHobbiesFilter(e.target.value); setPage(0); }} />
                    {hobbiesFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setHobbiesFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th>
                <div className="col-filter">
                  <div className="filter-input">
                    <input placeholder="Search by Needs" value={needsFilter} onChange={e=>{ setNeedsFilter(e.target.value); setPage(0); }} />
                    {needsFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setNeedsFilter(''); setPage(0); }}><Icon name="x"/></button>}
                  </div>
                </div>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.length===0 && (
              <tr><td colSpan={6}><div className="helper">No students</div></td></tr>
            )}
            {paged.map(s => (
              <tr key={s.id}>
                <td>{s.childName}</td>
                <td>{s.childDob || '-'}</td>
                <td>{guardianMap[s.guardianId] || s.guardianId}</td>
                <td>{(() => { 
                  const list = (s.hobbies||'').split(/[\n,]/).map(h=>h.trim()).filter(Boolean)
                  if (!list.length) return '—'
                    const full = list.join(', ')
                    return (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, maxWidth:260 }} title={full} aria-label={`${list.length} hobbies: ${full}`}>
                        {list.map(h => (
                          <span key={h} className="chip" style={{ background:hobbyColor(h), color:'#fff', padding:'2px 8px', borderRadius:16, fontSize:12, fontWeight:500 }}>
                            {highlight(h, hobbiesFilter)}
                          </span>
                        ))}
                      </div>
                    )
                })()}</td>
                <td>{(() => {
                  const codes = s.needs || []
                  if (!codes.length) return '—'
                  const labels = codes.map(c => NEED_LABEL[c] || c.replace(/_/g,' '))
                  const full = labels.join(', ')
                  return (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }} title={full} aria-label={`${codes.length} needs: ${full}`}>
                      {codes.map((code,i) => {
                        const lbl = labels[i]
                        const color = needColor(code)
                        return (
                          <span key={code+String(i)} className="chip chip-need" style={{ background:color, color:'#fff', padding:'2px 8px', borderRadius:16, fontSize:12, fontWeight:500 }} title={lbl}>
                            {highlight(lbl, needsFilter)}
                          </span>
                        )
                      })}
                    </div>
                  )
                })()}</td>
                <td>
                  <div className="action-buttons">
                    {!showArchived && <button className="btn-icon btn-icon--blue" title="Edit" aria-label="Edit" onClick={()=>openEdit(s)}><Icon name="pencil" /></button>}
                    {!showArchived && <button className="btn-icon btn-icon--red" title="Archive" aria-label="Archive" onClick={()=>openDelete(s)}><Icon name="trash" /></button>}
                    {showArchived && isAdmin && <button className="btn-icon btn-icon--blue" title="Restore" aria-label="Restore" onClick={()=>openRestore(s)}><Icon name="restore" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footbar">
          <div className="pager">
            <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}>Prev</button>
            <span className="helper">Page {page+1} of {totalPages}</span>
            <button className="btn btn-secondary" onClick={() => setPage(p => (p+1 < totalPages ? p+1 : p))} disabled={(page+1) >= totalPages}>Next</button>
          </div>
          <div className="footbar-right" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
            <span className="helper" aria-live="polite" style={{ whiteSpace:'nowrap' }}>
              {sorted.length === 0 ? 'No records found' : `Showing ${sorted.length === 0 ? 0 : (page*pageSize + 1)}–${Math.min(sorted.length, (page*pageSize) + paged.length)} of ${sorted.length}`}
            </span>
            <label className="switch-sm switch-rounded" title={showArchived ? 'Currently viewing archived students. Click to show active students.' : 'Currently viewing active students. Click to show archived students.'}>
              <input type="checkbox" checked={showArchived} onChange={e => { setShowArchived(e.target.checked); setPage(0) }} aria-label={showArchived ? 'Showing archived students (toggle to show active)' : 'Showing active students (toggle to show archived)'} />
              <span className="label">{showArchived ? 'Showing archived' : 'Show archived'}</span>
            </label>
          </div>
        </div>
      </div>
      
      {modal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="student-edit-title" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <strong id="student-edit-title">{modal.mode==='create' ? 'Add student' : 'Edit student'}</strong>
            </div>
            <div className="modal-body">
              <form onSubmit={e=>{ e.preventDefault(); saveModal() }} className="form-modern" noValidate>
                <div className="field">
                  <label htmlFor="st-guardian" className="req">Guardian</label>
                  <select id="st-guardian" required value={modal.form.guardianId} onChange={e=>onFormChange('guardianId', e.target.value)}>
                    <option value="">Select guardian…</option>
                    {guardians.map(g => <option key={g.id} value={g.id}>{g.fullName}</option>)}
                  </select>
                  {modal.errors.guardianId && <div className="error" role="alert">{modal.errors.guardianId}</div>}
                </div>
                <div className="field">
                  <label htmlFor="st-name" className="req">Child name</label>
                  <input id="st-name" value={modal.form.childName} onChange={e=>onFormChange('childName', e.target.value)} required />
                  {modal.errors.childName && <div className="error" role="alert">{modal.errors.childName}</div>}
                </div>
                <div className="field">
                  <label htmlFor="st-dob" className="req">Child date of birth</label>
                  <DatePicker
                    id="st-dob"
                    name="childDob"
                    value={modal.form.childDob}
                    onChange={v=>onFormChange('childDob', (v||'').toString())}
                    keepOpenUntilSelect
                    defaultViewDate={(() => {
                      const today = new Date();
                      return new Date(today.getFullYear()-10, today.getMonth(), 1);
                    })()}
                  />
                  {modal.errors.childDob && <div className="error" role="alert">{modal.errors.childDob}</div>}
                </div>
                <div className="field">
                  <label htmlFor="st-hobby-input">Hobbies <span className="helper">Add one at a time (Enter or Add). Duplicates ignored.</span></label>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    <input
                      id="st-hobby-input"
                      value={modal.hobbyDraft}
                      placeholder="Type a hobby"
                      onChange={e=>setModal(m=>m?{...m,hobbyDraft:e.target.value}:m)}
                      onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); addHobby() } }}
                      style={{ flex:'1 1 160px' }}
                    />
                    <button type="button" className="btn btn-secondary" onClick={addHobby} disabled={!modal.hobbyDraft.trim()}>Add</button>
                  </div>
                  {modal.hobbyList.length > 0 && (
                    <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }} aria-label="Hobbies list">
                      {modal.hobbyList.map(h => (
                        <span key={h} className="chip" style={{ display:'inline-flex', alignItems:'center', gap:4, background:hobbyColor(h), color:'#fff', fontSize:12 }}>
                          {h}
                          <button type="button" className="chip-x" aria-label={`Remove hobby ${h}`} onClick={()=>removeHobby(h)} style={{ color:'#fff' }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'baseline' }}>
                    <span>Additional needs</span>
                    <span className="helper">Tick all that apply</span>
                    <span aria-live="polite" style={{ background:'#1f2937', color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:500 }} title="Selected needs count">{modal.form.needs.length} selected</span>
                  </label>
                  {(() => {
                    let working = needOptions
                    if (working.length === 0) {
                      // Build temporary options from fallback for immediate UI
                      working = FALLBACK_NEEDS_CODES.map(code => ({ code, label: NEED_LABEL[code] || code.replace(/_/g,' '), color: NEED_COLOR[code] || needColor(code) }))
                    }
                    const optCodes = new Set(working.map(o => o.code))
                    const extras = modal.form.needs.filter(c => !optCodes.has(c)).map(code => ({ code, label: NEED_LABEL[code] || code.replace(/_/g,' '), color: NEED_COLOR[code] || needColor(code) }))
                    const all = [...working, ...extras]
                    return (
                      <>
                        <div className="checklist-grid" style={{ rowGap:8 }}>
                          {all.map(opt => {
                            const checked = modal.form.needs.includes(opt.code)
                            const col = needColor(opt.code)
                            return (
                              <React.Fragment key={opt.code}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={()=>toggleNeed(opt.code)}
                                  aria-checked={checked}
                                  aria-label={opt.label}
                                />
                                <span
                                  className="check-label"
                                  style={{
                                    display:'inline-flex',
                                    alignItems:'center',
                                    lineHeight:1.2,
                                    background: checked ? col : 'transparent',
                                    color: checked ? '#fff' : col,
                                    border: `1px solid ${col}`,
                                    padding:'2px 10px',
                                    borderRadius: 14,
                                    fontSize:12,
                                    fontWeight:500,
                                    transition:'background .18s, color .18s'
                                  }}
                                >{opt.label}</span>
                              </React.Fragment>
                            )
                          })}
                        </div>
                      </>
                    )
                  })()}
                </div>
                {modal.form.needs.includes('OTHER') && (
                  <div className="field">
                    <label htmlFor="st-needsOther">Other needs</label>
                    <input id="st-needsOther" value={modal.form.needsOtherText} onChange={e=>onFormChange('needsOtherText', e.target.value)} />
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-secondary" disabled={modal.busy} onClick={()=>setModal(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={modal.busy}>{modal.busy ? 'Saving…' : (modal.mode==='create' ? 'Register student' : 'Save changes')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.mode==='delete' ? 'Archive student' : 'Restore student'}
          message={<div>
            <p style={{marginTop:0}}>{confirm.mode==='delete' ? 'Are you sure you want to archive this student? This will remove the student from active lists (you can restore later).' : 'This will restore the student back to active lists.'}</p>
            <div className="confirm-summary">
              <div><strong>Name:</strong> {confirm.stu.childName || '-'}</div>
              <div><strong>DOB:</strong> {confirm.stu.childDob || '-'}</div>
            </div>
          </div>}
          busy={!!confirm.busy}
          onCancel={()=> setConfirm(null)}
          onConfirm={confirmAction}
          confirmLabel={confirm.mode==='delete' ? (confirm.busy ? 'Archiving…' : 'Archive') : (confirm.busy ? 'Restoring…' : 'Restore')}
          confirmStyle={confirm.mode==='delete' ? 'danger' : 'primary'}
        />
      )}

      {dialog && (
        <div className="modal-backdrop" role="presentation" onClick={()=>setDialog(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="student-dialog-title" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <strong id="student-dialog-title">{dialog.title}</strong>
              <button type="button" className="chip-x" aria-label="Close" onClick={()=>setDialog(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{marginTop:0}}>{dialog.message}</p>
              <div className="flex justify-end mt-4">
                <button type="button" className="btn btn-secondary" onClick={()=>setDialog(null)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Students
