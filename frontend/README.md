# SNCRwanda Frontend

A responsive, accessible React + TypeScript app for data entry and reports. It targets the API Gateway on http://localhost:9090 during development via Vite proxy.

Quick start

- Prereq: Node 18+ and npm.
- Install:
  npm install
- Dev server (proxied to API Gateway 9090):
  npm run dev
- Tests:
  npm test
- Typecheck + Production build:
  npm run build
- Preview production build:
  npm run preview

Environment

- Dev uses Vite proxy to http://localhost:9090, no env needed.
- For production builds, set:
  - VITE_API_BASE=https://your-gateway-url

Accessibility and usability

- Keyboard: global skip link, visible focus, semantic landmarks.
- Forms: labeled controls, helpful hints, and aria-live errors.
- Responsive: fluid layout with stack-at-small breakpoints.

Troubleshooting

- If proxy 404s at /auth or /students, check API Gateway routes. As a fallback, use direct service paths in dev:
  - /_auth → :9092, /_student → :9095, /_reporting → :9096, etc.
- If TypeScript complains about process in vite.config.ts, we removed Node typings and use static proxy URLs.

