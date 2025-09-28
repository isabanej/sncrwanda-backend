import React, { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

type UUID = string

type Student = {
  id: UUID
  childName: string
  childDob: string
}

type Report = {
  id: UUID
  studentId: UUID
  date?: string
  term?: string
  comments?: string
}

const GuardianPortal: React.FC = () => {
  const { token } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [reports, setReports] = useState<Report[]>([])
  // We intentionally avoid surfacing backend errors here; show empty state instead.
  // If needed, we can later add a subtle helper-only message.

  useEffect(() => {
    let on = true
    const safeStudents = api.get<Student[]>('/guardians/me/students', token).catch((e: any) => {
      if (e instanceof ApiError) return [] as Student[]
      return [] as Student[]
    })
    const safeReports = api.get<Report[]>('/guardians/me/reports', token).catch((e: any) => {
      if (e instanceof ApiError) return [] as Report[]
      return [] as Report[]
    })
    Promise.all([safeStudents, safeReports]).then(([s, r]) => { if (on) { setStudents(s); setReports(r) } })
    return () => { on = false }
  }, [token])

  return (
    <section className="grid">
      <div className="card">
        <h2>My Students</h2>
  {/* Errors are suppressed; we show empty-state below if needed */}
        {students.length === 0 ? (
          <div className="helper">No records found</div>
        ) : (
          <table className="table" aria-label="My students">
            <thead>
              <tr>
                <th>Name</th>
                <th>DOB</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>{s.childName}</td>
                  <td>{s.childDob}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card">
        <h2>My Students' Reports</h2>
        {reports.length === 0 ? (
          <div className="helper">No records found</div>
        ) : (
          <table className="table" aria-label="My students reports">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student ID</th>
                <th>Term</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.studentId}</td>
                  <td>{r.term}</td>
                  <td>{r.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default GuardianPortal

