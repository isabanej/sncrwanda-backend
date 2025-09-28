// Clean rebuild of Guardians page after corruption
import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../components/shared/ConfirmModal'
import { Icon } from '../components/Icon'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { MSG } from '../lib/messages'
import { isPhone } from '../lib/validation'

type UUID = string
interface Guardian { id: UUID; fullName: string; phone: string; email?: string; address?: string }

const Guardians: React.FC = () => {
  const { token, logout, user } = useAuth()
  const toast = useToast()
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reload, setReload] = useState(0)
  const [editDialog, setEditDialog] = useState<null | { mode:'create'|'edit'|'delete'|'restore'; id?:UUID; form:{ fullName:string; phone:string; email:string; address:string }; errors?: { [k:string]: string|undefined }; busy?: boolean }> (null)

  const [filter, setFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [addressFilter, setAddressFilter] = useState('')
  type SortKey = 'fullName'|'phone'|'email'|'address'
  const [sortKey, setSortKey] = useState<SortKey>('fullName')
  const [sortDir, setSortDir] = useState<'asc'|'desc'|undefined>()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const isAdmin = !!user?.roles?.some(r => r === 'ADMIN' || r === 'SUPER_ADMIN')

  useEffect(() => { let on = true; (async () => {
    setLoading(true)
    try {
      const url = showArchived ? '/students/guardians?archived=true' : '/students/guardians'
      const fb = showArchived ? '/_student/students/guardians?archived=true' : '/_student/students/guardians'
      const list = await api.get<Guardian[]>(url, token).catch(async e => { if(e instanceof ApiError && (e.status===401||e.status===403)) throw e; try { return await api.get<Guardian[]>(fb, token) } catch { return [] } })
      if (on) setGuardians(list)
    } catch (e:any) {
      if (e instanceof ApiError && e.status===401) { toast.show(MSG.sessionExpired,'error'); logout(); return }
      if (e instanceof ApiError && e.status===403) { toast.show('Not authorized','error'); return }
      toast.show(e?.message||'Failed to load guardians','error')
    } finally { setLoading(false) }
  })(); return () => { on=false } }, [token, showArchived, reload, logout, toast])

  function formatPhone(v: string){ const raw=v.trim(); const hadPlus=raw.startsWith('+'); const d=raw.replace(/\D/g,''); if(!d) return ''; if(hadPlus && d.startsWith('2507') && d.length===12){ const t=d.slice(3); return `+250 ${t.slice(0,3)} ${t.slice(3,6)} ${t.slice(6,9)}` } if(!hadPlus && d.startsWith('07') && d.length===10) return `${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7,10)}`; return (hadPlus?'+':'')+d }
  function validateField(field:'fullName'|'phone'|'email', value:string){ let err: string | undefined; if(field==='fullName') err=value.trim()?undefined:MSG.fullNameRequired; if(field==='phone') err=value.trim()&&isPhone(value)?undefined:MSG.phoneInvalid; if(field==='email'){ const v=value.trim(); err = v && !/.+@.+\..+/.test(v)?MSG.invalidEmail:undefined } return err }
  function setDialogField(field:'fullName'|'phone'|'email'|'address', value:string){
    setEditDialog(d=>{
      if(!d) return d
      const form = { ...d.form, [field]: field==='phone'? value : value }
      let errors = d.errors||{}
      if(['fullName','phone','email'].includes(field)) {
        let v = form[field as keyof typeof form] as string
        if(field==='phone') v = formatPhone(v)
        errors = { ...errors, [field]: validateField(field as any, v) }
        if(field==='phone') form.phone = v
      }
      return { ...d, form, errors }
    })
  }

  const filtered = useMemo(()=>{ let list=guardians; const f=filter.trim().toLowerCase(); if(f) list = list.filter(g => Object.values(g).some(v => (v||'').toString().toLowerCase().includes(f))); if(nameFilter) list=list.filter(g=>g.fullName.toLowerCase().includes(nameFilter.toLowerCase())); if(phoneFilter) list=list.filter(g=>g.phone.toLowerCase().includes(phoneFilter.toLowerCase())); if(emailFilter) list=list.filter(g=>(g.email||'').toLowerCase().includes(emailFilter.toLowerCase())); if(addressFilter) list=list.filter(g=>(g.address||'').toLowerCase().includes(addressFilter.toLowerCase())); if(sortDir && sortKey) list=[...list].sort((a,b)=>{ const av=(a as any)[sortKey]||''; const bv=(b as any)[sortKey]||''; return sortDir==='asc'? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av)) }); return list }, [guardians, filter, nameFilter, phoneFilter, emailFilter, addressFilter, sortDir, sortKey])
  const paged = filtered.slice(page*pageSize, page*pageSize + pageSize)

  function openCreateDialog(){ setEditDialog({ mode:'create', form:{ fullName:'', phone:'', email:'', address:'' }, errors:{} }) }
  function openEditDialog(g:Guardian){ setEditDialog({ mode:'edit', id:g.id, form:{ fullName:g.fullName, phone:g.phone, email:g.email||'', address:g.address||'' }, errors:{} }) }
  function openDeleteDialog(g:Guardian){ setEditDialog({ mode:'delete', id:g.id, form:{ fullName:g.fullName, phone:g.phone, email:g.email||'', address:g.address||'' } }) }
  function openRestoreDialog(g:Guardian){ setEditDialog({ mode:'restore', id:g.id, form:{ fullName:g.fullName, phone:g.phone, email:g.email||'', address:g.address||'' } }) }
  function onEditDialogChange(e:React.ChangeEvent<HTMLInputElement>){ const {name,value}=e.target; setDialogField(name as any, value) }
  async function onEditDialogSubmit(e:React.FormEvent){ e.preventDefault(); if(!editDialog) return; // validate
    let anyErr=false; const f = editDialog.form; const fields: ('fullName'|'phone'|'email')[] = ['fullName','phone','email'];
    const errs: any = {}
    fields.forEach(k=>{ const v=(f as any)[k]; const er = validateField(k,v); errs[k]=er; if(er) anyErr=true })
    if(anyErr){ setEditDialog(d=> d? {...d, errors:{...d.errors,...errs}}:d); return }
    setEditDialog(d=> d? {...d, busy:true}:d)
    try {
      if(editDialog.mode==='edit' && editDialog.id){
        await api.put(`/students/guardians/${editDialog.id}`, editDialog.form, token)
        toast.show('Guardian updated','success')
      } else if(editDialog.mode==='create') {
        const created = await api.post<Guardian>('/students/guardians', editDialog.form, token)
        setGuardians(g=>[created,...g])
        toast.show('Guardian created','success')
      }
      setEditDialog(null); setReload(r=>r+1)
    } catch(err:any){ if(err instanceof ApiError && err.status===401){ toast.show(MSG.sessionExpired,'error'); logout(); return } if(err instanceof ApiError && err.status===403){ toast.show('Not authorized','error'); return } toast.show(err?.message||'Save failed','error') } finally { setEditDialog(d=> d? {...d, busy:false}:d) }
  }
  async function onEditDialogDelete(){ if(!editDialog) return; setEditDialog(d=> d? {...d, busy:true}:d); try { await api.delete(`/students/guardians/${editDialog.id}`, token); toast.show('Guardian archived','success'); setEditDialog(null); setReload(r=>r+1) } catch(err:any){ if(err instanceof ApiError && err.status===401){ toast.show(MSG.sessionExpired,'error'); logout(); return } toast.show(err?.message||'Delete failed','error') } }
  async function onEditDialogRestore(){ if(!editDialog) return; setEditDialog(d=> d? {...d, busy:true}:d); try { await api.post(`/students/guardians/${editDialog.id}/restore`, {}, token); toast.show('Guardian restored','success'); setEditDialog(null); setReload(r=>r+1) } catch(err:any){ if(err instanceof ApiError && err.status===401){ toast.show(MSG.sessionExpired,'error'); logout(); return } toast.show(err?.message||'Restore failed','error') } }

  return <div className="p-4 space-y-4">
    <div className="card">
      <h2 style={{marginTop:0}}>Guardians</h2>
      <div className="table-toolbar">
        <div className="toolbar-left" style={{gap:8}}>
          <button className="btn btn-primary" type="button" onClick={openCreateDialog}>Add guardian</button>
          <span>Show</span>
          <select value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(0) }} aria-label="Results per page">{[5,10,20,50].map(n=> <option key={n} value={n}>{n}</option>)}</select>
          <span>result per page</span>
        </div>
        <div className="toolbar-right" style={{gap:6}}>
          <input className="input-search" placeholder="Filter in records..." aria-label="Filter guardians" value={filter} onChange={e=>{ setFilter(e.target.value); setPage(0) }} />
          {filter && <button className="btn-icon btn-icon--blue" type="button" title="Clear filter" aria-label="Clear filter" onClick={()=>{ setFilter(''); setPage(0) }}><Icon name="x" /></button>}
          <button className="btn-icon btn-icon--blue" type="button" title="Refresh" aria-label="Refresh guardians list" onClick={()=> setReload(r=>r+1)} disabled={loading}><Icon name="refresh" /></button>
        </div>
      </div>
      <table className="table" aria-label="Guardians table">
        <thead>
          <tr>{(['fullName','phone','email','address'] as const).map(k=> <th key={k} aria-sort={sortKey===k ? (sortDir==='asc'?'ascending': sortDir==='desc'?'descending':'none'):'none'}><button type="button" className="btn btn-secondary btn-sm" onClick={()=>{ const next = sortKey!==k ? 'asc' : (sortDir==='asc'?'desc': sortDir==='desc'? undefined : 'asc'); setSortKey(k); setSortDir(next as any); setPage(0) }} style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{fontWeight:700}}>{k==='fullName'?'Name':k[0].toUpperCase()+k.slice(1)}</span>{sortKey!==k && <Icon name="sort" />}{sortKey===k && sortDir==='asc' && <Icon name="sortAsc" />}{sortKey===k && sortDir==='desc' && <Icon name="sortDesc" />}</button></th>)}<th style={{width:90}}>Action</th></tr>
          <tr className="filter-row">
            <th><div className="col-filter"><div className="filter-input"><input placeholder="Search by Name" value={nameFilter} onChange={e=>{ setNameFilter(e.target.value); setPage(0) }} />{ nameFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setNameFilter(''); setPage(0) }}><Icon name="x" /></button>}</div></div></th>
            <th><div className="col-filter"><div className="filter-input"><input placeholder="Search by Phone" value={phoneFilter} onChange={e=>{ setPhoneFilter(e.target.value); setPage(0) }} />{ phoneFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setPhoneFilter(''); setPage(0) }}><Icon name="x" /></button>}</div></div></th>
            <th><div className="col-filter"><div className="filter-input"><input placeholder="Search by Email" value={emailFilter} onChange={e=>{ setEmailFilter(e.target.value); setPage(0) }} />{ emailFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setEmailFilter(''); setPage(0) }}><Icon name="x" /></button>}</div></div></th>
            <th><div className="col-filter"><div className="filter-input"><input placeholder="Search by Address" value={addressFilter} onChange={e=>{ setAddressFilter(e.target.value); setPage(0) }} />{ addressFilter && <button className="btn-icon btn-icon--blue" title="Clear" onClick={()=>{ setAddressFilter(''); setPage(0) }}><Icon name="x" /></button>}</div></div></th>
            <th />
          </tr>
        </thead>
        <tbody>
          {paged.length===0 && <tr><td colSpan={5}><div className="helper">No records found</div></td></tr>}
          {paged.map(g=> <tr key={g.id}><td className="linkish">{g.fullName}</td><td>{g.phone}</td><td>{g.email}</td><td>{g.address}</td><td><div className="action-buttons">{!showArchived ? <><button className="btn-icon btn-icon--blue" title="Edit" aria-label="Edit guardian" onClick={()=>openEditDialog(g)}><Icon name="pencil" /></button><button className="btn-icon btn-icon--red" title="Delete" aria-label="Delete guardian" onClick={()=>openDeleteDialog(g)}><Icon name="trash" /></button></> : isAdmin && <button className="btn-icon btn-icon--blue" title="Restore" aria-label="Restore guardian" onClick={()=>openRestoreDialog(g)}><Icon name="restore" /></button>}</div></td></tr>)}
        </tbody>
      </table>
      <div className="table-footbar">
        <div className="pager"><button className="btn btn-secondary" onClick={()=> setPage(p=>Math.max(0,p-1))} disabled={page===0}>Prev</button><span className="helper">Page {page+1} of {Math.max(1, Math.ceil(filtered.length/pageSize))}</span><button className="btn btn-secondary" onClick={()=> setPage(p=> (p+1 < Math.ceil(filtered.length/pageSize)? p+1:p))} disabled={(page+1)>=Math.ceil(filtered.length/pageSize)}>Next</button></div>
        <div className="footbar-right" style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
          <span className="helper" aria-live="polite" style={{whiteSpace:'nowrap'}}>{filtered.length===0? 'No records found' : `Showing ${(page*pageSize)+1}–${Math.min(filtered.length, page*pageSize+paged.length)} of ${filtered.length}`}</span>
          {isAdmin && <label className="switch-sm switch-rounded" title={showArchived? 'Currently viewing archived guardians. Click to show active guardians.' : 'Currently viewing active guardians. Click to show archived guardians.'}><input type="checkbox" checked={showArchived} onChange={e=>{ setShowArchived(e.target.checked); setPage(0) }} aria-label={showArchived? 'Showing archived guardians (toggle to show active)':'Showing active guardians (toggle to show archived)'} /><span className="label">{showArchived? 'Showing archived':'Show archived'}</span></label>}
        </div>
      </div>
  </div>

  {editDialog && (editDialog.mode==='edit' || editDialog.mode==='create') && <div className="modal-backdrop" role="presentation" onClick={()=> { if(!editDialog.busy) setEditDialog(null) }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-guardian-title" onClick={e=>e.stopPropagation()}><div className="modal-head"><strong id="edit-guardian-title">{editDialog.mode==='create' ? 'Add guardian':'Edit guardian'}</strong><button type="button" className="chip-x" aria-label="Close" onClick={()=> setEditDialog(null)} disabled={!!editDialog.busy}>×</button></div><div className="modal-body"><form id="edit-guardian-form" className="form-modern" onSubmit={onEditDialogSubmit} noValidate><div className="form-2col"><div className="field"><label htmlFor="eg-fullName" className="req">Full name</label><input id="eg-fullName" name="fullName" required value={editDialog.form.fullName} onChange={onEditDialogChange} /></div><div className="field"><label htmlFor="eg-phone" className="req">Phone</label><input id="eg-phone" name="phone" required value={editDialog.form.phone} onChange={onEditDialogChange} /></div></div><div className="form-2col"><div className="field"><label htmlFor="eg-email">Email</label><input id="eg-email" name="email" value={editDialog.form.email} onChange={onEditDialogChange} /></div><div className="field"><label htmlFor="eg-address">Address</label><input id="eg-address" name="address" value={editDialog.form.address} onChange={onEditDialogChange} /></div></div><div className="modal-actions"><button type="submit" className="btn btn-primary" disabled={!!editDialog.busy}>{editDialog.busy? (editDialog.mode==='create'?'Saving…':'Saving…') : (editDialog.mode==='create' ? 'Save guardian':'Save changes')}</button><button type="button" className="btn btn-secondary" onClick={()=> setEditDialog(null)} style={{marginLeft:8}}>Cancel</button></div></form></div></div></div>}

    {editDialog && (editDialog.mode==='delete' || editDialog.mode==='restore') && <ConfirmModal title={editDialog.mode==='delete'? 'Delete guardian':'Restore guardian'} message={<div><p style={{marginTop:0}}>{editDialog.mode==='delete'? 'Are you sure you want to delete this guardian? This is a soft delete for archiving.':'This will restore the guardian back to active lists.'}</p><div className="confirm-summary"><div><strong>Name:</strong> {editDialog.form.fullName||'-'}</div><div><strong>Phone:</strong> {editDialog.form.phone||'-'}</div></div></div>} busy={!!editDialog.busy} onCancel={()=> setEditDialog(null)} onConfirm={()=> { editDialog.mode==='delete'? onEditDialogDelete(): onEditDialogRestore() }} confirmLabel={editDialog.mode==='delete'? (editDialog.busy?'Deleting…':'Delete') : (editDialog.busy? 'Restoring…':'Restore')} confirmStyle={editDialog.mode==='delete'? 'danger':'primary'} />}
  </div>
}

export default Guardians
