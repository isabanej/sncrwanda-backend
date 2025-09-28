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

const NEED_OPTIONS = ['Physical','Hearing','Social/ Communication (Autism)','Mental/ Emotional health','Health conditional (e.g Epilepsy)','Mobility','Visual','Speech/ Language','Learning','Other']
const NEED_ENUM: Record<string,string> = {
  'Physical':'PHYSICAL','Hearing':'HEARING','Social/ Communication (Autism)':'SOCIAL_COMMUNICATION_AUTISM','Mental/ Emotional health':'MENTAL_EMOTIONAL_HEALTH','Health conditional (e.g Epilepsy)':'HEALTH_CONDITION','Mobility':'MOBILITY','Visual':'VISUAL','Speech/ Language':'SPEECH_LANGUAGE','Learning':'LEARNING','Other':'OTHER'
}
const emptyForm: FormState = { guardianId: '', childName: '', childDob: '', hobbies: '', needs: [], needsOtherText: '' }

const Students: React.FC = () => {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isAdmin = !!user?.roles?.some(r => r === 'ADMIN' || r === 'SUPER_ADMIN')

  const [students, setStudents] = useState<Student[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reload, setReload] = useState(0)

  const [modal, setModal] = useState<null | { mode: 'create'|'edit'; busy?: boolean; id?: UUID; form: FormState; errors: Partial<Record<keyof FormState, string>> }>(null)
  const [confirm, setConfirm] = useState<null | { mode: 'delete'|'restore'; stu: Student; busy?: boolean }>(null)
  const [dialog, setDialog] = useState<null | { title: string; message: string; type: 'success'|'error'; restoreId?: UUID }>(null)
  // Global quick filter (toolbar) + per-column filters
  const [filter, setFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [dobFilter, setDobFilter] = useState('')
  const [guardianFilter, setGuardianFilter] = useState('')
  // Sorting
  const [sortKey, setSortKey] = useState<null | 'name' | 'dob' | 'guardian'>(null)
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
      setStudents(list)
      setGuardians(gs)
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { toast.show(MSG.sessionExpired, 'error'); logout(); navigate('/login', { replace:true }); return }
      toast.show(e?.message || 'Failed to load students', 'error')
    } finally { setLoading(false) }
  })() }, [token, showArchived, reload])

  const guardianMap = useMemo(() => Object.fromEntries(guardians.map(g => [g.id, g.fullName])), [guardians])
  const baseFiltered = useMemo(() => {
    const gl = filter.trim().toLowerCase()
    const nf = nameFilter.trim().toLowerCase()
    const df = dobFilter.trim().toLowerCase()
    const gf = guardianFilter.trim().toLowerCase()
    return students.filter(s => {
      const gName = guardianMap[s.guardianId] || s.guardianId || ''
      const matchesGlobal = !gl || [s.childName, s.childDob, gName].some(v => (v||'').toLowerCase().includes(gl))
      if (!matchesGlobal) return false
      if (nf && !s.childName.toLowerCase().includes(nf)) return false
      if (df && !(s.childDob||'').toLowerCase().includes(df)) return false
      if (gf && !gName.toLowerCase().includes(gf)) return false
      return true
    })
  }, [students, filter, nameFilter, dobFilter, guardianFilter, guardianMap])

  function toggleSort(key: 'name' | 'dob' | 'guardian') {
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
  useEffect(() => { setPage(0) }, [filter, nameFilter, dobFilter, guardianFilter, showArchived])
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

  function openCreate() { setModal({ mode: 'create', form: { ...emptyForm }, errors: {} }) }
  function openEdit(s: Student) { setModal({ mode: 'edit', id: s.id, form: { guardianId: s.guardianId, childName: s.childName||'', childDob: s.childDob||'', hobbies: s.hobbies||'', needs: s.needs||[], needsOtherText: s.needsOtherText||''}, errors: {} }) }
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
        hobbies: modal.form.hobbies.trim() || undefined,
        needs: modal.form.needs.length ? modal.form.needs.map(n => NEED_ENUM[n] || 'OTHER') : undefined,
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
                { key:'guardian', label:'Guardian' }
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
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.length===0 && (
              <tr><td colSpan={4}><div className="helper">No students</div></td></tr>
            )}
            {paged.map(s => (
              <tr key={s.id}>
                <td>{s.childName}</td>
                <td>{s.childDob || '-'}</td>
                <td>{guardianMap[s.guardianId] || s.guardianId}</td>
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
        <div className="modal-backdrop" role="presentation" onClick={()=>{ if(!modal.busy) setModal(null) }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="student-edit-title" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <strong id="student-edit-title">{modal.mode==='create' ? 'Add student' : 'Edit student'}</strong>
              <button type="button" className="chip-x" aria-label="Close" onClick={()=>setModal(null)} disabled={modal.busy}>×</button>
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
                  <DatePicker id="st-dob" name="childDob" value={modal.form.childDob} onChange={v=>onFormChange('childDob', (v||'').toString())} />
                  {modal.errors.childDob && <div className="error" role="alert">{modal.errors.childDob}</div>}
                </div>
                <div className="field">
                  <label htmlFor="st-hobbies">Hobbies</label>
                  <textarea id="st-hobbies" value={modal.form.hobbies} onChange={e=>onFormChange('hobbies', e.target.value)} placeholder="Comma or newline separated" />
                </div>
                <div className="field">
                  <label>Additional needs <span className="helper">Tick all that apply</span></label>
                  <div className="checklist-grid">
                    {NEED_OPTIONS.map(opt => (
                      <React.Fragment key={opt}>
                        <input type="checkbox" checked={modal.form.needs.includes(opt)} onChange={()=>toggleNeed(opt)} />
                        <span className="check-label">{opt}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                {modal.form.needs.includes('Other') && (
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
