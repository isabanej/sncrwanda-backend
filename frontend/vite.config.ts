import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Avoid adding @types/node; declare minimal process for config typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any
const port = Number((process && (process.env?.PORT || process.env?.VITE_PORT)) || 5173)

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    strictPort: false,
    proxy: {
      '/auth': { target: 'http://localhost:9090', changeOrigin: true },
      '/admin': { target: 'http://localhost:9090', changeOrigin: true },
      '/transactions': { target: 'http://localhost:9090', changeOrigin: true },
      '/student-reports': { target: 'http://localhost:9090', changeOrigin: true },
      '/students': { target: 'http://localhost:9090', changeOrigin: true },
  '/guardians': { target: 'http://localhost:9090', changeOrigin: true },
      '/reports': { target: 'http://localhost:9090', changeOrigin: true },
      '/employee-evaluations': { target: 'http://localhost:9090', changeOrigin: true },
      '/hr': { target: 'http://localhost:9090', changeOrigin: true },
      // Direct service routes (fallbacks during dev)
      '/_auth': { target: 'http://localhost:9092', changeOrigin: true, rewrite: p => p.replace(/^\/_auth/, '') },
      '/_ledger': { target: 'http://localhost:9091', changeOrigin: true, rewrite: p => p.replace(/^\/_ledger/, '') },
      '/_hr': { target: 'http://localhost:9094', changeOrigin: true, rewrite: p => p.replace(/^\/_hr/, '') },
      '/_student': { target: 'http://localhost:9095', changeOrigin: true, rewrite: p => p.replace(/^\/_student/, '') },
      '/_reporting': { target: 'http://localhost:9096', changeOrigin: true, rewrite: p => p.replace(/^\/_reporting/, '') }
    }
  },
  preview: { port }
})
