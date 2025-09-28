import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: number; message: string; type?: 'info' | 'success' | 'error' }

type ToastCtx = {
  toasts: Toast[]
  show: (message: string, type?: Toast['type']) => void
  remove: (id: number) => void
}

const Ctx = createContext<ToastCtx | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])
  const remove = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])
  const value = useMemo(() => ({ toasts, show, remove }), [toasts, show, remove])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" style={{ position:'fixed', bottom: 16, right: 16, display:'grid', gap:8, zIndex: 1000 }}>
        {toasts.map(t => (
          <div key={t.id} role="status" className={`card`} style={{ borderColor: t.type==='error'?'#ff6b6b':t.type==='success'?'#28a745':undefined }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span>{t.message}</span>
              <button aria-label="Dismiss" className="btn btn-secondary" onClick={() => remove(t.id)} style={{ padding:'.2rem .4rem', marginLeft:'auto' }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

