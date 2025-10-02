import React, { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

type UUID = string

type Student = {
  id: UUID
  childName: string
  childDob: string
}

const GuardianPortal: React.FC = () => {
  const { token } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  // We intentionally avoid surfacing backend errors here; show empty state instead.
  // If needed, we can later add a subtle helper-only message.

  useEffect(() => {
    let on = true
    const safeStudents = api.get<Student[]>('/guardians/me/students', token).catch((e: any) => {
      if (e instanceof ApiError) return [] as Student[]
      return [] as Student[]
    })
    Promise.all([safeStudents]).then(([s]) => { if (on) { setStudents(s) } })
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
    </section>
  )
}

export default GuardianPortal

