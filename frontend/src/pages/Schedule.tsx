import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

type Item = {
  id: string
  month: string
  weekIndex: number
  dayOfWeek: number // 1..7
  title: string
  timeText: string
  teacherName?: string
  imageUrl?: string
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const Schedule: React.FC = () => {
  const { token, user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState<string>(() => `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|undefined>()

  const weeks = useMemo(() => {
    const grid: (Item | null)[][] = Array.from({ length: 5 }, () => Array(7).fill(null))
    for (const it of items) {
      if (it.weekIndex >= 0 && it.weekIndex < 5 && it.dayOfWeek >= 1 && it.dayOfWeek <= 7) {
        grid[it.weekIndex][it.dayOfWeek-1] = it
      }
    }
    return grid
  }, [items])

  const canEdit = !!user && (user.roles?.includes('TEACHER') || user.roles?.includes('ADMIN') || user.roles?.includes('SUPER_ADMIN'))

  const load = async () => {
    setLoading(true); setError(undefined)
    try {
      const list = await api.get<Item[]>(`/students/schedule?month=${encodeURIComponent(month)}`, token).catch(async (e:any)=>{
        // dev fallback
        return await api.get<Item[]>(`/_student/students/schedule?month=${encodeURIComponent(month)}`, token)
      })
      setItems(list)
    } catch (e:any) {
      setError(e?.message || 'Failed to load schedule')
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [month])

  const onSeed = async () => {
    try {
      await api.post(`/students/schedule/seed-demo?month=${encodeURIComponent(month)}`, {}, token).catch(async ()=>{
        await api.post(`/_student/students/schedule/seed-demo?month=${encodeURIComponent(month)}`, {}, token)
      })
      await load()
    } catch {}
  }

  const onAdd = async (w:number, d:number) => {
    const title = prompt('Class title', 'Yoga training') || 'Yoga training'
    const timeText = prompt('Time (e.g., 7 am-6 am)', '7 am-6 am') || '7 am-6 am'
    const teacherName = prompt('Teacher name', 'Teacher A') || 'Teacher'
    const imageUrl = `https://source.unsplash.com/collection/483251/200x200?sig=${Math.floor(Math.random()*1000)}`
    const payload = { month, weekIndex: w, dayOfWeek: d+1, title, timeText, teacherName, imageUrl }
    await api.post('/students/schedule', payload, token).catch(async ()=>{
      await api.post('/_student/students/schedule', payload, token)
    })
    await load()
  }

  const monthName = (ym: string) => {
    const [y,m] = ym.split('-').map(Number)
    return new Date(y, m-1, 1).toLocaleString(undefined, { month: 'long' })
  }

  const computePrevMonth = (ym: string) => {
    const [y,m] = ym.split('-').map(Number)
    const dt = new Date(y, m-2, 1)
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
  }
  const computeNextMonth = (ym: string) => {
    const [y,m] = ym.split('-').map(Number)
    const dt = new Date(y, m, 1)
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
  }

  const prevMonth = () => {
    setMonth(computePrevMonth(month))
  }
  const nextMonth = () => {
    setMonth(computeNextMonth(month))
  }

  return (
    <section className="container">
      <div className="card">
        <h2 className="text-center" style={{ textAlign:'center', marginTop: 0 }}>Class Schedule Table</h2>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="table-wrap">
          <table className="table table-bordered text-center schedule">
            <thead>
              <tr>
                {DAYS.map(d => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {weeks.map((row, w) => (
                <tr key={w}>
                  {row.map((cell, d) => (
                    <td key={d} className="text-center">
                      {cell ? (
                        <div>
                          <div className="img rounded-circle mb-2" style={{ backgroundImage: `url(${cell.imageUrl})` }} />
                          <div><strong>{cell.title}</strong></div>
                          <div className="schedule-time">{cell.timeText}</div>
                        </div>
                      ) : (
                        canEdit ? <button className="linkish" onClick={()=>onAdd(w,d)} title="Add">×</button> : <span>×</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>
                  <button className="btn btn-secondary" onClick={prevMonth}>
                    ‹ {monthName(computePrevMonth(month))}
                  </button>
                </th>
                <th colSpan={5}></th>
                <th style={{ textAlign:'right' }}>
                  <button className="btn btn-secondary" onClick={nextMonth}>
                    {monthName(computeNextMonth(month))} ›
                  </button>
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
        {canEdit && (
          <div style={{ display:'flex', gap:8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={onSeed} disabled={loading}>Seed demo for {month}</button>
            <span className="helper">Click × to add to a specific day.</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default Schedule
