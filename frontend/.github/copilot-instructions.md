# SNCRwanda Frontend - AI Agent Guidelines

## Architecture Overview
- **Frontend**: React 18 + TypeScript + Vite SPA targeting API Gateway at `localhost:9090`
- **Routing**: React Router with role-based protection (`ADMIN`, `TEACHER`, `GUARDIAN`)
- **State**: Context-based auth (`AuthProvider`) + localStorage persistence
- **API**: Custom `api.ts` wrapper with `ApiError` class for backend error handling
- **Validation**: Zod schemas with field-level error extraction (`validation.ts`)
- **UI**: Custom toast notifications (`ToastProvider`) + responsive CSS classes

## Critical Workflows
- **Development**: `npm run dev` - starts Vite dev server with API proxy to `:9090`
- **Build**: `npm run build` - TypeScript check + Vite production build
- **Test**: `npm test` - Vitest with jsdom environment
- **API Fallbacks**: Use `/_auth`, `/_student`, `/_reporting` routes for direct service access during development

## Project Conventions

### Authentication & Authorization
- Use `useAuth()` hook for token/user state
- Role-based routing: `<RoleProtected roles={["ADMIN","TEACHER"]}>`
- Token automatically included in API requests via `Authorization: Bearer` header
- Session expiry handled with toast notification and redirect to login

### API Integration
```typescript
// Pattern: Use api wrapper with error handling
try {
  const data = await api.post<Student>('/students', formData)
  toast.show(MSG.studentCreated, 'success')
} catch (err) {
  if (err instanceof ApiError) {
    // Handle specific error codes
    toast.show(err.message, 'error')
  }
}
```

### Form Validation
```typescript
// Pattern: Zod validation with field-level errors
const result = validateStudent(formData)
if (!result.valid) {
  setFieldErrors(result.errors) // Partial<Record<keyof Student, string>>
}

// Live validation: validateStudentField('childName', value)
```

### Component Structure
- Pages in `/src/pages/` with data fetching + form handling
- Shared logic in `/src/lib/` (auth, api, validation, toast, messages)
- Assets in `/src/assets/` and `/src/img/`
- Tests alongside components (`.test.tsx`)

### Error Handling
- API errors: `ApiError` class with status, code, details fields
- Validation errors: Field-level with `FieldErrors<T>` type
- User feedback: Toast notifications with auto-dismiss (4s)
- Auth errors: Automatic logout + redirect on 401/403

### Styling Patterns
- CSS classes: `btn`, `btn-cta`, `btn-secondary`, `card`, `container`
- Responsive: Fluid layout with stack-at-small breakpoints
- Accessibility: ARIA labels, semantic landmarks, keyboard navigation

## Key Files Reference
- `src/lib/auth.tsx` - Authentication context and API calls
- `src/lib/api.ts` - HTTP wrapper with error handling
- `src/lib/validation.ts` - Zod schemas and validation helpers
- `src/lib/toast.tsx` - Notification system
- `src/lib/messages.ts` - Centralized message constants
- `vite.config.ts` - Proxy configuration for API Gateway + direct services
- `src/main.tsx` - App routing with role protection

## Development Tips
- Backend services run on ports 9091-9096; use fallback routes if gateway is down
- Environment: Set `VITE_API_BASE` for production builds
- Testing: Use `@testing-library/react` with Vitest globals
- TypeScript: Strict mode enabled, focus on type safety for API responses</content>
<parameter name="filePath">c:\dev\sncrwanda-backend\frontend\.github\copilot-instructions.md