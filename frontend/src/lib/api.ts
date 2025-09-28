export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown
  url?: string
  responseText?: string
  traceId?: string
  constructor(message: string, status: number, code?: string, details?: unknown, url?: string, responseText?: string, traceId?: string) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.url = url
    this.responseText = responseText
    this.traceId = traceId
  }
}

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) || ''

function getToken() {
  try { return localStorage.getItem('token') || undefined } catch { return undefined }
}

type RequestOpts = { method?: HttpMethod; body?: any; token?: string; noAuth?: boolean }

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, token, noAuth } = opts
  const headers: Record<string, string> = { 'Accept': 'application/json' }
  let payload: BodyInit | undefined
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const authHeader: Record<string,string> | undefined = !noAuth && (token || getToken())
    ? { Authorization: `Bearer ${token || getToken()}` }
    : undefined
  const url = BASE + path
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...(authHeader ?? {}) },
    body: payload,
    credentials: 'include'
  })
  if (!res.ok) {
    let msg = res.statusText
    let code: string | undefined
    let details: unknown
    let raw: string | undefined
    let traceId: string | undefined
    try {
      const ct = res.headers.get('content-type') || ''
      // Read body once as text, then try to parse JSON if applicable
      raw = await res.text().catch(() => '') || undefined
      if (ct.includes('application/json') && raw) {
        try {
          const data = JSON.parse(raw)
          if (data && typeof data === 'object') {
            // Common error envelope from backend: { timestamp, traceId, path, code, message, details }
            // Fallbacks: error, errors
            // @ts-ignore
            code = data.code
            // @ts-ignore
            details = data.details || data.errors
            // @ts-ignore
            traceId = data.traceId
            // @ts-ignore
            msg = data.message || data.error || raw
          }
        } catch {
          // raw was not valid JSON despite content-type
          if (raw) msg = raw
        }
      } else if (raw) {
        msg = raw
      }
    } catch {}
    throw new ApiError(msg, res.status, code, details, path, raw, traceId)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json() as Promise<T>
  // @ts-expect-error: when T is void
  return undefined
}

export const api = {
  get: <T>(path: string, token?: string, noAuth?: boolean) => request<T>(path, { method: 'GET', token, noAuth }),
  post: <T>(path: string, body?: any, token?: string, noAuth?: boolean) => request<T>(path, { method: 'POST', body, token, noAuth }),
  put: <T>(path: string, body?: any, token?: string, noAuth?: boolean) => request<T>(path, { method: 'PUT', body, token, noAuth }),
  delete: <T>(path: string, token?: string, noAuth?: boolean) => request<T>(path, { method: 'DELETE', token, noAuth })
}
