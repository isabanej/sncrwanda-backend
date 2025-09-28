/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_GATEWAY_URL?: string
  readonly VITE_AUTH_URL?: string
  readonly VITE_LEDGER_URL?: string
  readonly VITE_HR_URL?: string
  readonly VITE_STUDENT_URL?: string
  readonly VITE_REPORTING_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  const src: string
  export default src
}
