import React, { useState } from 'react'
import { useToast } from '../lib/toast'
import { validateAppointment, validateAppointmentField } from '../lib/validation'
import PhoneInput from '../components/PhoneInput'
import { MSG } from '../lib/messages'

const Appointment: React.FC = () => {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string; message?: string }>({})
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; phone?: boolean; message?: boolean }>({})

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as { name: keyof typeof form; value: string }
    setForm(f => ({ ...f, [name]: value }))
    if (touched[name]) {
      const err = validateAppointmentField(name as any, value as any)
      setFieldErrors(prev => ({ ...prev, [name]: err }))
    }
  }

  const onBlurField = (name: keyof typeof form, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    const err = validateAppointmentField(name as any, value as any)
    setFieldErrors(prev => ({ ...prev, [name]: err }))
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = validateAppointment(form)
    if (v.valid === false) {
      setFieldErrors(v.errors)
      toast.show(MSG.fixFields, 'error')
      return
    }
    setBusy(true)
    setTimeout(() => {
      toast.show(MSG.apptSent, 'success')
      setBusy(false)
      setForm({ name: '', email: '', phone: '', message: '' })
      setFieldErrors({}); setTouched({})
    }, 600)
  }

  return (
    <section className="grid">
      <div className="card" style={{ maxWidth: 720 }}>
        <h2>Book an Appointment</h2>
        <p className="helper">Share your contact details and a short note. Our team will reach out to schedule.</p>
        <form id="appointment-form" className="form-modern" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="name" className="req">Full name</label>
            <input id="name" name="name" required value={form.name} onChange={onChange}
                   onBlur={e => onBlurField('name', e.target.value)} placeholder="Enter full name"
                   aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'appt-name-error' : undefined} />
            {fieldErrors.name && <div id="appt-name-error" className="error" role="alert">{fieldErrors.name}</div>}
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={onChange}
                   onBlur={e => onBlurField('email', e.target.value)} placeholder="Enter email"
                   aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'appt-email-error' : undefined} />
            {fieldErrors.email && <div id="appt-email-error" className="error" role="alert">{fieldErrors.email}</div>}
          </div>
          <div className="field">
            <label htmlFor="phone" style={{display:'flex',alignItems:'center',gap:6}}>Phone Number <span tabIndex={0} aria-label="Rwanda format: plus two five zero seven followed by eight digits" title="Rwanda format: +2507XXXXXXXX (9 digits)" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,fontSize:11,fontWeight:700,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface-muted)',color:'#334155',cursor:'help'}}>i</span></label>
            <PhoneInput id="phone" value={form.phone} onChange={v=> { setForm(f=>({...f, phone:v})); if(touched.phone){ const err = validateAppointmentField('phone', v as any); setFieldErrors(e=>({...e, phone: err})); } }} onBlur={e=> onBlurField('phone', (e.target as HTMLInputElement).value)} placeholder="+2507XXXXXXXX" persistKey="appointment" enableSearch aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'appt-phone-error' : undefined} />
            {fieldErrors.phone && <div id="appt-phone-error" className="error" role="alert">{fieldErrors.phone}</div>}
          </div>
          <div className="field">
            <label htmlFor="message" className="req">Message</label>
            <textarea id="message" name="message" rows={4} value={form.message} onChange={onChange}
                      onBlur={e => onBlurField('message', e.target.value)} placeholder=""
                      aria-invalid={!!fieldErrors.message} aria-describedby={fieldErrors.message ? 'appt-message-error' : undefined} />
            {fieldErrors.message && <div id="appt-message-error" className="error" role="alert">{fieldErrors.message}</div>}
          </div>
          <div>
            <button className="btn btn-cta" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default Appointment
