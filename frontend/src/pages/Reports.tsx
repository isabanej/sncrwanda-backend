import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useNavigate } from 'react-router-dom'
import { validateReport, validateReportField } from '../lib/validation'
import { MSG } from '../lib/messages'
import { Icon } from '../components/Icon'
import { DatePicker } from '../lib/ui/DatePicker'
import { HoverInfo } from '../components/HoverInfo'

type UUID = string

interface Report { id: UUID; studentId: UUID; teacherId: UUID; comments?: string; improvementPlan?: string; term?: string; date?: string; branchId?: UUID; createdAt?: string; archived?: boolean }

// Optional flags (active / deleted) included for filtering; backend may or may not supply them.
type Student = { id: UUID; childName: string; active?: boolean; deleted?: boolean; isDeleted?: boolean; archived?: boolean }
type Employee = { id: string; fullName: string; position?: string; active?: boolean; deleted?: boolean; isDeleted?: boolean; archived?: boolean }

// (HoverInfo moved to shared component)

const Reports: React.FC = () => {
  const { user, token, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [reports, setReports] = useState<Report[]>([])
  // Full raw lists used for name mapping
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  // Filtered selectable lists (exclude inactive/deleted)
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Employee[]>([])
  const [teacherLoadError, setTeacherLoadError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<string>()
  const [showArchived, setShowArchived] = useState(false)
  const [confirm, setConfirm] = useState<null | { mode:'archive'|'restore'; rep: Report; busy?: boolean }>(null)
  const isAdmin = !!user?.roles?.some(r => r === 'ADMIN' || r === 'SUPER_ADMIN')

  // Server-side paging toggle (hooks). Set to true to enable querying backend with paging/sorting/filter params.
  const SERVER_PAGING = false // TODO: set true when backend adds paging + filtering params for /student-reports
  const [serverTotal, setServerTotal] = useState<number | undefined>(undefined)

  // Branch context
  const branchId = useMemo(()=> user?.branchId, [user])

  // Modal state
  const [modal, setModal] = useState<null | { mode:'create'|'edit'; id?:UUID; form:{ studentId:UUID|''; teacherId:UUID|''; term:string; date:string; comments:string; improvementPlan:string }; errors: Partial<Record<'studentId'|'teacherId'|'term'|'date'|'comments'|'improvementPlan', string>>; busy?: boolean }>(null)

  // Filters & sorting & paging
  const [filter, setFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')
  type SortKey = 'date'|'student'|'teacher'|'term'
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc'|'desc'|undefined>('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const isTeacher = !!user?.roles?.includes('TEACHER') && !isAdmin

  // UUID validator (RFC 4122 variants 1-5). Used to ensure we never send invalid
  // placeholder / free‑text filters to the backend (which would trigger 400
  // conversion errors like: Failed to convert value of type 'java.lang.String' to required type 'java.util.UUID').
  const UUID_RE = useMemo(()=> /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, [])

  // Load data (supports client or server paging)
  // Debug utilities (test instrumentation)
  function dbg(...args: any[]){
    try {
      // @ts-ignore
      if((window as any).__REPORTS_DEBUG__){
        // @ts-ignore
        const arr = (window as any).__REPORTS_LOG__ = (window as any).__REPORTS_LOG__ || []
        arr.push(args.map(a=> (typeof a==='object'? JSON.stringify(a): String(a))).join(' '))
      }
    } catch {}
  }

  // Prevent overlapping loads.
  // Rationale: In test environments (and React 18 StrictMode double-invoke patterns),
  // rapid state changes (setReload + filter resets) were triggering concurrent executions
  // of the data loading effect causing a storm of fetches that sometimes pre-empted
  // transient UI state (e.g. archive confirm modal) before it rendered. This lightweight
  // guard ensures only one in-flight load cycle proceeds at a time. It is intentionally
  // stateful outside React's render cycle (ref) to avoid additional re-renders.
  const loadingRef = useRef(false)
  useEffect(()=>{ let on=true; (async ()=>{
    if(loadingRef.current){ dbg('load:skip-overlap'); return }
    loadingRef.current = true
    dbg('load:start', { showArchived, filter, studentFilter, teacherFilter, termFilter })
    setLoading(true)
  setTeacherLoadError(false)
    try {
      let rep: Report[] = []
      let studs: Student[] = []
      let emps: any[] = []
      let teacherFetchError = false
      // Batch requests to reduce intermediate renders
      if (SERVER_PAGING){
        try {
          const params = new URLSearchParams()
          params.set('page', String(page))
          if (pageSize) params.set('size', String(pageSize))
          if (showArchived) params.set('archived','true')
          if (filter.trim()) params.set('q', filter.trim())
          // Only send student / teacher filter params if they are valid UUIDs.
          // (Front-end free text name filtering remains client-side until server supports partial name search.)
          if (studentFilter.trim()) {
            const val = studentFilter.trim()
            if (UUID_RE.test(val)) params.set('student', val)
          }
          if (teacherFilter.trim()) {
            const val = teacherFilter.trim()
            if (UUID_RE.test(val)) params.set('teacher', val)
          }
          if (termFilter.trim()) params.set('term', termFilter.trim())
          if (sortDir && sortKey){ params.set('sort', `${sortKey},${sortDir}`) }
          const url = '/student-reports?'+params.toString()
          const data = await api.get<any>(url, token)
          if (Array.isArray(data)) { rep = data; setServerTotal(data.length) }
          else if (data && Array.isArray(data.content)) { rep = data.content; setServerTotal(typeof data.totalElements==='number'? data.totalElements : data.content.length) }
          else { rep = []; setServerTotal(0) }
        } catch(e:any){ if(!(e instanceof ApiError && e.status===404)) throw e }
        try { studs = await api.get<Student[]>('/students', token) } catch(e:any){ if(!(e instanceof ApiError && e.status===404)) throw e }
        try { emps = await api.get<any[]>('/hr/employees', token) } catch(e:any){ if(!(e instanceof ApiError && e.status===404)) throw e }
      } else {
        // Simplified: rely on new lightweight endpoints
        const [repRes, studentOpts, teacherOpts] = await Promise.all([
          (async ()=>{ try { return await api.get<Report[]>(showArchived? '/student-reports?archived=true':'/student-reports', token) } catch(e:any){ if(!(e instanceof ApiError && e.status===404)) throw e; return [] } })(),
          (async ()=>{ try { return await api.get<any[]>('/students/select', token) } catch(e:any){ if(!(e instanceof ApiError && e.status===404)) throw e; return [] } })(),
          (async ()=>{ try { return await api.get<any[]>('/hr/teachers', token) } catch(e:any){ teacherFetchError = true; return [] } })(),
        ])
        rep = repRes||[];
        // Map lightweight student options into Student shape expected elsewhere
        studs = (studentOpts||[]).map((o:any)=> ({ id:o.id, childName:o.name }))
        emps = teacherOpts||[];
        setServerTotal(undefined)
      }
      if(on){
        setReports(rep||[])
        // Preserve full student list, then filter out inactive / deleted for selection
        const rawStudents = studs||[]
        setAllStudents(rawStudents)
        const filteredStudents = rawStudents.filter(s => {
          const inactive = s.active === false
          const deleted = (s as any).deleted === true || (s as any).isDeleted === true || (s as any).archived === true
          return !inactive && !deleted
        })
        setStudents(filteredStudents)
        // Teachers now delivered already filtered by backend
        const rawTeachers = (emps||[])
        setAllEmployees(rawTeachers)
        const finalTeachers = rawTeachers.filter(e=> !(e.active===false) && !(e as any).deleted && !(e as any).isDeleted && !(e as any).archived)
        setTeachers(finalTeachers)
  if(filteredStudents.length===0){ dbg('students:emptyRaw', rawStudents.length) } else { dbg('students:first', JSON.stringify(filteredStudents.slice(0,3))) }
        // Decide if we surface a warning: only if teacher endpoint failed AND we have zero final teachers
        if(teacherFetchError && finalTeachers.length===0){
          setTeacherLoadError(true)
        } else {
          setTeacherLoadError(false)
        }
        setError(undefined)
        dbg('load:done', { rep: rep.length, studs: studs.length, emps: emps.length })
      }
    } catch(e:any){
      dbg('load:error', e?.message)
      if(e instanceof ApiError && (e.status===401||e.status===403)){ toast.show(MSG.sessionExpired,'error'); logout(); navigate('/login',{replace:true}); return }
      let msg = e?.message||'Failed to load reports'
      if(/invalid uuid/i.test(msg) || /Failed to convert value of type 'java\.lang\.String' to required type 'java\.util\.UUID'/i.test(msg)){
        // Only blame user filters when we actually attempted to send UUID-based filters via server paging.
        if(SERVER_PAGING && (studentFilter.trim() || teacherFilter.trim())){
          msg = 'Some filter value is invalid. Please clear filters and try again.'
        } else {
          // More generic guidance when the error originates from a backend endpoint unrelated to current filters
          msg = 'Data load issue (invalid identifier encountered). Please refresh. If it persists contact support.'
        }
      }
      setError(msg)
    } finally { setLoading(false); dbg('load:end'); loadingRef.current=false }
  })(); return ()=>{ on=false } }, [token, reload, showArchived, SERVER_PAGING, page, pageSize, sortKey, sortDir, filter, studentFilter, teacherFilter, termFilter])

  // Maps
  const studentMap = useMemo(()=> Object.fromEntries(students.map(s=>[s.id, s.childName])), [students])
  const teacherMap = useMemo(()=> Object.fromEntries(teachers.map(t=>[t.id, t.fullName])), [teachers])

  // If only one teacher candidate exists (admin creating) and none selected yet, auto-select it for convenience
  useEffect(()=> {
    if(!isTeacher && teachers.length===1 && modal && modal.mode==='create' && !modal.form.teacherId){
      setModal(m => m ? { ...m, form:{ ...m.form, teacherId: teachers[0].id }} : m)
    }
  }, [teachers, modal, isTeacher])

  // Derived filtered list
  const filtered = useMemo(()=>{
    if (SERVER_PAGING) return reports // server already applied filters & sort
    let list = reports
    if(filter.trim()){ const f=filter.trim().toLowerCase(); list = list.filter(r => [r.date, r.term, studentMap[r.studentId], teacherMap[r.teacherId], r.comments, r.improvementPlan].some(v => (v||'').toLowerCase().includes(f))) }
    if(studentFilter) list = list.filter(r => (studentMap[r.studentId]||'').toLowerCase().includes(studentFilter.toLowerCase()))
    if(teacherFilter) list = list.filter(r => (teacherMap[r.teacherId]||'').toLowerCase().includes(teacherFilter.toLowerCase()))
    if(termFilter) list = list.filter(r => (r.term||'').toLowerCase().includes(termFilter.toLowerCase()))
    if(sortDir && sortKey){
      list = [...list].sort((a,b)=>{
        let av:string = ''
        let bv:string = ''
        if(sortKey==='date'){ av=a.date||''; bv=b.date||'' }
        if(sortKey==='student'){ av=studentMap[a.studentId]||''; bv=studentMap[b.studentId]||'' }
        if(sortKey==='teacher'){ av=teacherMap[a.teacherId]||''; bv=teacherMap[b.teacherId]||'' }
        if(sortKey==='term'){ av=a.term||''; bv=b.term||'' }
        return sortDir==='asc'? av.localeCompare(bv): bv.localeCompare(av)
      })
    }
    return list
  }, [reports, filter, studentFilter, teacherFilter, termFilter, sortDir, sortKey, studentMap, teacherMap])

  const paged = SERVER_PAGING ? reports : filtered.slice(page*pageSize, page*pageSize + pageSize)
  const total = SERVER_PAGING ? (serverTotal ?? reports.length) : filtered.length

  function toggleSort(k: SortKey){ setSortKey(prev=>{ if(prev!==k){ const nextDir: 'asc'|'desc'|undefined = 'asc'; setSortDir(nextDir); return k } const next = sortDir==='asc'?'desc': sortDir==='desc'? undefined : 'asc'; setSortDir(next as any); return k }) }

  function openCreate(){
    const today = new Date().toISOString().slice(0,10)
    setModal({ mode:'create', form:{ studentId:'', teacherId: isTeacher? (user?.id||''):'', term:'', date: today, comments:'', improvementPlan:'' }, errors:{} })
  }
  function openEdit(r: Report){ setModal({ mode:'edit', id:r.id, form:{ studentId:r.studentId, teacherId:r.teacherId, term:r.term||'', date:r.date||'', comments:r.comments||'', improvementPlan:r.improvementPlan||'' }, errors:{} }) }

  function onModalField<K extends keyof NonNullable<typeof modal>['form']>(k: K, v: string){
    setModal(m=>{
      if(!m) return m
      return { ...m, form:{ ...m.form, [k]: v }, errors:{ ...m.errors, [k]: validateReportField(k as any, v as any) } }
    })
  }

  async function saveModal(){
    if(!modal) return
    const validation = validateReport(modal.form as any)
    if(!validation.valid){
      setModal(m=> m? { ...m, errors:{...m.errors, ...validation.errors} }:m)
      toast.show(MSG.fixFields,'error')
      return
    }
    setModal(m=> m? { ...m, busy:true }:m)
    try {
      const base = { ...modal.form,
        comments: modal.form.comments.trim()||undefined,
        improvementPlan: modal.form.improvementPlan.trim()||undefined,
        term: modal.form.term.trim()||undefined,
        date: modal.form.date || undefined,
        branchId: branchId || (user as any)?.branchId || undefined
      } as any
      if(modal.mode==='edit' && modal.id){
        const updated = await api.put<Report>(`/student-reports/${modal.id}`, base, token)
        setReports(r=> r.map(x=> x.id===modal.id? updated: x))
        toast.show('Report updated','success')
      } else {
        const created = await api.post<Report>('/student-reports', base, token)
        setReports(r=> [created, ...r])
        toast.show(MSG.reportCreated,'success')
      }
      setModal(null)
    } catch(e:any){
      if(e instanceof ApiError && (e.status===401||e.status===403)){
        toast.show(MSG.sessionExpired,'error'); logout(); navigate('/login',{replace:true}); return
      }
      let msg = e?.message||'Save failed'
      if(/teacherid must match authenticated user/i.test(msg)) msg = 'You can only create a report for yourself as a teacher.'
      if(/no permission/i.test(msg)) msg = 'You do not have permission to perform this action.'
      if(/branch/i.test(msg) && /another|null/.test(msg.toLowerCase())) msg = 'Branch mismatch – please verify your branch.'
      toast.show(msg,'error')
    } finally { setModal(m=> m? { ...m, busy:false }:m) }
  }

  // Persist page size, filters, sorting, archived toggle
  useEffect(()=>{ try {
    const ps = localStorage.getItem('reports.pageSize'); if(ps){ const n=parseInt(ps); if(!isNaN(n)) setPageSize(n) }
    const f = localStorage.getItem('reports.f.filter'); if(f) setFilter(f)
  const sf = localStorage.getItem('reports.f.student'); if(sf && sf !== 'select') setStudentFilter(sf)
  const tf = localStorage.getItem('reports.f.teacher'); if(tf && tf !== 'select') setTeacherFilter(tf)
    const tmf = localStorage.getItem('reports.f.term'); if(tmf) setTermFilter(tmf)
    const sk = localStorage.getItem('reports.sort.key') as SortKey | null; if(sk) setSortKey(sk)
    const sd = localStorage.getItem('reports.sort.dir') as 'asc'|'desc'|undefined|null; if(sd) setSortDir(sd as any)
    const arch = localStorage.getItem('reports.showArchived'); if(arch) setShowArchived(arch==='1')
  } catch {} }, [])
  useEffect(()=>{ try { localStorage.setItem('reports.pageSize', String(pageSize)) } catch {} }, [pageSize])
  useEffect(()=>{ try { localStorage.setItem('reports.f.filter', filter) } catch {} }, [filter])
  useEffect(()=>{ try { localStorage.setItem('reports.f.student', studentFilter) } catch {} }, [studentFilter])
  useEffect(()=>{ try { localStorage.setItem('reports.f.teacher', teacherFilter) } catch {} }, [teacherFilter])
  useEffect(()=>{ try { localStorage.setItem('reports.f.term', termFilter) } catch {} }, [termFilter])
  useEffect(()=>{ try { sortKey && localStorage.setItem('reports.sort.key', sortKey) } catch {} }, [sortKey])
  useEffect(()=>{ try { sortDir? localStorage.setItem('reports.sort.dir', sortDir) : localStorage.removeItem('reports.sort.dir') } catch {} }, [sortDir])
  useEffect(()=>{ try { localStorage.setItem('reports.showArchived', showArchived? '1':'0') } catch {} }, [showArchived])

  useEffect(()=>{ setPage(0) }, [filter, studentFilter, teacherFilter, termFilter, showArchived])

  function clearAllFilters(){ setFilter(''); setStudentFilter(''); setTeacherFilter(''); setTermFilter(''); setPage(0) }
  function openArchive(r: Report){ dbg('confirm:openArchive', r.id); setConfirm({ mode:'archive', rep:r }) }
  function openRestore(r: Report){ dbg('confirm:openRestore', r.id); setConfirm({ mode:'restore', rep:r }) }
  async function doConfirm(){ if(!confirm) return; setConfirm(c=> c? {...c, busy:true}:c); try {
    if(confirm.mode==='archive'){
      await api.delete(`/student-reports/${confirm.rep.id}`, token)
      if(SERVER_PAGING){ setReload(r=>r+1) } else { setReports(r=> r.filter(x=> x.id!==confirm.rep.id)) }
      toast.show('Report archived','success')
    } else {
      await api.post(`/student-reports/${confirm.rep.id}/restore`, {}, token)
      toast.show('Report restored','success'); setReload(r=>r+1)
    }
    dbg('confirm:done', confirm.mode, confirm.rep.id)
    setConfirm(null)
  } catch(e:any){
    if(e instanceof ApiError && e.status===401){ toast.show(MSG.sessionExpired,'error'); logout(); navigate('/login',{replace:true}); return }
    toast.show(e?.message||'Operation failed','error')
  } finally { setConfirm(c=> c? {...c, busy:false}:c) } }

  return (
  <div className="p-4 space-y-4" aria-label="Reports" data-testid="reports-root">
      <div className="card">
        <h2 style={{marginTop:0}}>Student Reports</h2>
        <div className="table-toolbar">
          <div className="toolbar-left" style={{gap:8}}>
            <button className="btn btn-primary" type="button" onClick={openCreate}>Add report</button>
            <span>Show</span>
            <select value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(0) }} aria-label="Results per page">{[5,10,20,50].map(n=> <option key={n} value={n}>{n}</option>)}</select>
            <span>result per page</span>
          </div>
          <div className="toolbar-right" style={{gap:6}}>
            <input className="input-search" placeholder="Search in records..." aria-label="Filter reports" value={filter} onChange={e=>{ setFilter(e.target.value); setPage(0) }} />
            {(filter||studentFilter||teacherFilter||termFilter) && <button className="btn btn-secondary" type="button" title="Clear all filters" aria-label="Clear all filters" onClick={clearAllFilters}>Clear filters</button>}
            <button className="btn-icon btn-icon--blue" type="button" title="Refresh" aria-label="Refresh reports list" onClick={()=> { setPage(0); setReload(r=>r+1) }} disabled={loading}><Icon name="refresh" /></button>
          </div>
        </div>
  {error && <div className="error" role="alert" style={{marginBottom:8}}>{error}</div>}
  {!error && teacherLoadError && <div className="helper" role="status" style={{marginBottom:8,background:'#fff8e1',border:'1px solid #f0d48a',padding:6}}>Teacher list failed to load (using fallback employees filtering). Reports data shown below.</div>}
  <table className="table" aria-label="Reports table" data-testid="reports-table">
          <thead>
            <tr>
              {(['date','student','teacher','term'] as const).map(k => (
                <th key={k} aria-sort={sortKey===k ? (sortDir==='asc'?'ascending': sortDir==='desc'?'descending':'none'):'none'}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={()=>toggleSort(k)} style={{display:'inline-flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:700}}>{k[0].toUpperCase()+k.slice(1)}</span>
                    {sortKey!==k && <Icon name="sort" />}
                    {sortKey===k && sortDir==='asc' && <Icon name="sortAsc" />}
                    {sortKey===k && sortDir==='desc' && <Icon name="sortDesc" />}
                  </button>
                </th>
              ))}
              <th>Comments</th>
              <th style={{width:110}}>Actions</th>
            </tr>
            <tr className="filter-row">
              <th />
              <th><div className="col-filter"><div className="filter-input"><input placeholder="Search by Student" value={studentFilter} onChange={e=>{ setStudentFilter(e.target.value); setPage(0) }} />{studentFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setStudentFilter(''); setPage(0) }}><Icon name="x" /></button>}</div></div></th>
              <th><div className="col-filter"><div className="filter-input"><input placeholder="Search by Teacher" value={teacherFilter} onChange={e=>{ setTeacherFilter(e.target.value); setPage(0) }} />{teacherFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setTeacherFilter(''); setPage(0) }}><Icon name="x" /></button>}</div></div></th>
              <th><div className="col-filter"><div className="filter-input"><input placeholder="Search by Term" value={termFilter} onChange={e=>{ setTermFilter(e.target.value); setPage(0) }} />{termFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setTermFilter(''); setPage(0) }}><Icon name="x" /></button>}</div></div></th>
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} data-testid="reports-loading"><div className="skeleton" style={{height:16}} /></td></tr>}
            {!loading && paged.length===0 && <tr><td colSpan={6}><div className="helper">No records found</div></td></tr>}
            {!loading && paged.map(r => <tr key={r.id}>
              <td>{r.date||'-'}</td>
              <td>{studentMap[r.studentId] || r.studentId}</td>
              <td>{teacherMap[r.teacherId] || r.teacherId}</td>
              <td>{r.term||'-'}</td>
              <td>{(r.comments||'').slice(0,40)}{(r.comments||'').length>40 && '…'}</td>
              <td><div className="action-buttons">
                {!showArchived && <>
                  <button className="btn-icon btn-icon--blue" title="Edit" aria-label="Edit report" onClick={()=>openEdit(r)}><Icon name="pencil" /></button>
                  <button className="btn-icon btn-icon--red" title="Archive" aria-label="Archive report" data-testid={`archive-btn-${r.id}`} onClick={()=>openArchive(r)}><Icon name="trash" /></button>
                </>}
                {showArchived && <button className="btn-icon btn-icon--blue" title="Restore" aria-label="Restore report" onClick={()=>openRestore(r)}><Icon name="restore" /></button>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
  <div className="table-footbar">
          <div className="pager"><button className="btn btn-secondary" onClick={()=> setPage(p=>Math.max(0,p-1))} disabled={page===0}>Prev</button><span className="helper">Page {page+1} of {Math.max(1, Math.ceil(filtered.length/pageSize))}</span><button className="btn btn-secondary" onClick={()=> setPage(p=> (p+1 < Math.ceil(filtered.length/pageSize)? p+1:p))} disabled={(page+1)>=Math.ceil(filtered.length/pageSize)}>Next</button></div>
          <div className="footbar-right" style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
            {isAdmin && (
              <label className="switch-sm switch-rounded" title={showArchived? 'Currently viewing archived reports. Click to show active reports.' : 'Currently viewing active reports. Click to show archived reports.'}>
                <input type="checkbox" checked={showArchived} onChange={e=>{ setShowArchived(e.target.checked); setPage(0) }} aria-label={showArchived? 'Showing archived reports (toggle to show active)':'Showing active reports (toggle to show archived)'} />
                <span className="label">{showArchived? 'Showing archived':'Show archived'}</span>
              </label>
            )}
            <span className="helper" aria-live="polite" style={{whiteSpace:'nowrap'}}>{total===0? 'No records found' : `Showing ${total===0?0:(page*pageSize)+1}–${Math.min(total, page*pageSize+paged.length)} of ${total}`}</span>
          </div>
        </div>
      </div>

      {modal && createPortal(<div className="modal-backdrop" role="presentation" onClick={()=> { if(!modal.busy) setModal(null) }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title" data-testid="report-edit-modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-head">
            <strong id="report-modal-title">{modal.mode==='create'? 'Add report':'Edit report'}</strong>
            <button type="button" className="chip-x" aria-label="Close" onClick={()=> setModal(null)} disabled={!!modal.busy}>×</button>
          </div>
          <div className="modal-body">
            <form className="form-modern" onSubmit={e=>{ e.preventDefault(); saveModal() }} noValidate>
              {(!students.length || !teachers.length) && <div className="helper" style={{background:'#fff8e1',border:'1px solid #f0d48a',padding:8,marginBottom:12}}>
                {!students.length && <div>No active students found.</div>}
                {!teachers.length && <div>No active teachers found.</div>}
              </div>}
              <div className="form-2col">
                <div className="field">
                  <label htmlFor="rp-student" className="req">Student</label>
                  <select id="rp-student" required aria-required="true" aria-invalid={!!modal.errors.studentId} aria-describedby={modal.errors.studentId? 'err-report-student': undefined} value={modal.form.studentId} onChange={e=>onModalField('studentId', e.target.value)}>
                    <option value="">Select student…</option>
                    {students.map(s=> <option key={s.id} value={s.id}>{s.childName}</option>)}
                  </select>
                  {modal.errors.studentId && <div id="err-report-student" className="error" role="alert" aria-live="assertive">{modal.errors.studentId}</div>}
                </div>
                <div className="field">
                  {isTeacher ? (
                    // Teacher role: skip visible teacher selection entirely; keep hidden input for submission
                    <>
                      <input id="rp-teacher" type="hidden" value={modal.form.teacherId || user?.id || ''} readOnly />
                    </>
                  ) : (
                    <>
                      <label htmlFor="rp-teacher" className="req" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Teacher <HoverInfo text="If list is empty contact admin." ariaLabel="Teacher list help" placement="right" />
                      </label>
                      <select id="rp-teacher" required aria-required="true" aria-invalid={!!modal.errors.teacherId} aria-describedby={modal.errors.teacherId? 'err-report-teacher': undefined} value={modal.form.teacherId} onChange={e=>onModalField('teacherId', e.target.value)}>
                        <option value="">Select teacher…</option>
                        {teachers.map(t=> <option key={t.id} value={t.id}>{t.fullName}</option>)}
                      </select>
                      {teachers.length===0 && !modal.busy && <div className="helper" style={{marginTop:4}} aria-live="polite">No active teachers available.</div>}
                      {modal.errors.teacherId && <div id="err-report-teacher" className="error" role="alert" aria-live="assertive">{modal.errors.teacherId}</div>}
                    </>
                  )}
                </div>
              </div>
              <div className="form-2col">
                <div className="field">
                  <label htmlFor="rp-term">Term</label>
                  <input id="rp-term" value={modal.form.term} onChange={e=>onModalField('term', e.target.value)} />
                  {modal.errors.term && <div className="error" role="alert">{modal.errors.term}</div>}
                </div>
                <div className="field">
                  <label htmlFor="rp-date">Date</label>
                  <DatePicker id="rp-date" name="date" value={modal.form.date} onChange={v=>onModalField('date', (v||''))} />
                  {modal.errors.date && <div className="error" role="alert">{modal.errors.date}</div>}
                </div>
              </div>
              <div className="field">
                <label htmlFor="rp-comments">Comments</label>
                <textarea id="rp-comments" rows={3} value={modal.form.comments} onChange={e=>onModalField('comments', e.target.value)} />
                {modal.errors.comments && <div className="error" role="alert">{modal.errors.comments}</div>}
              </div>
              <div className="field">
                <label htmlFor="rp-plan">Improvement plan</label>
                <textarea id="rp-plan" rows={3} value={modal.form.improvementPlan} onChange={e=>onModalField('improvementPlan', e.target.value)} />
                {modal.errors.improvementPlan && <div className="error" role="alert">{modal.errors.improvementPlan}</div>}
              </div>
              <div className="modal-actions">
                {/** Disable submit until required fields present */}
                <button type="submit" className="btn btn-primary" disabled={!!modal.busy || !modal.form.studentId || (!isTeacher && !modal.form.teacherId)} aria-disabled={!!modal.busy || !modal.form.studentId || (!isTeacher && !modal.form.teacherId)}>
                  {modal.busy? (modal.mode==='create'? 'Creating…':'Saving…') : (modal.mode==='create'? 'Create report':'Save changes')}
                </button>
                <button type="button" className="btn btn-secondary" style={{marginLeft:8}} onClick={()=> setModal(null)} disabled={!!modal.busy}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
  </div>, document.getElementById('modal-root') || document.body)}

      {confirm && createPortal(<div className="modal-backdrop" role="presentation" onClick={()=> { if(!confirm.busy) setConfirm(null) }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-rep-modal" data-testid="report-confirm-modal" data-confirm-mode={confirm.mode} onClick={e=>e.stopPropagation()}>
          <div className="modal-head">
            <strong id="confirm-rep-modal">{confirm.mode==='archive'? 'Archive report':'Restore report'}</strong>
            <button type="button" className="chip-x" onClick={()=> setConfirm(null)} aria-label="Close" disabled={!!confirm.busy}>×</button>
          </div>
          <div className="modal-body">
            <p style={{marginTop:0}}>{confirm.mode==='archive'? 'Are you sure you want to archive this report? You can restore it later.' : 'This will restore the report back to active lists.'}</p>
            {confirm.mode==='archive' && <div data-testid="confirm-archive-state" style={{display:'none'}} />}
            {confirm.mode==='restore' && <div data-testid="confirm-restore-state" style={{display:'none'}} />}
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" data-testid={confirm.mode==='archive'? 'confirm-archive':'confirm-restore'} disabled={!!confirm.busy} onClick={doConfirm}>{confirm.mode==='archive'? (confirm.busy? 'Archiving…':'Archive') : (confirm.busy? 'Restoring…':'Restore')}</button>
              <button type="button" className="btn btn-secondary" style={{marginLeft:8}} disabled={!!confirm.busy} onClick={()=> setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
  </div>, document.getElementById('modal-root') || document.body)}
    </div>
  )
}

export default Reports
