import { z } from 'zod'
import { MSG } from './messages'

// Helper: phone format (allow +, digits, spaces, dashes, parentheses) and 7-15 digits
export const isPhone = (v: string) => {
  const digitsOnly = v.replace(/\D/g, '')
  if(!/^\+?[0-9 ()-]+$/.test(v)) return false
  if(digitsOnly.length < 7 || digitsOnly.length > 15) return false
  // Rwanda strict rule: +250 7 followed by 9 digits (total after 250: 10 digits including leading 7)
  if(v.startsWith('+250')){
    const after = digitsOnly.slice(3) // remove 250
    if(!after.startsWith('7')) return false
    // New rule: +2507 plus 8 other digits (9 total local digits)
    if(after.length !== 9) return false
  }
  return true
}

// Schemas with explicit required messages
export const RegisterSchema = z.object({
  username: z.string().trim().min(1, MSG.usernameRequired).min(3, 'Username must be at least 3 characters'),
  email: z.string().trim().min(1, MSG.emailRequired).email(MSG.invalidEmail),
  password: z.string().min(6, MSG.passwordLengthExactly)
})

export type RegisterInput = z.infer<typeof RegisterSchema>

export type FieldErrors<T> = Partial<Record<keyof T, string>>

export function extractFieldErrors<T extends Record<string, unknown>>(error: z.ZodError<T>): FieldErrors<T> {
  const errs: FieldErrors<T> = {}
  for (const issue of error.issues) {
    const path = issue.path?.[0]
    if (typeof path === 'string') {
      ;(errs as any)[path] = issue.message
    }
  }
  return errs
}

export function validateRegister(input: RegisterInput): { valid: true } | { valid: false; errors: FieldErrors<RegisterInput> } {
  const parsed = RegisterSchema.safeParse(input)
  if (parsed.success) return { valid: true }
  return { valid: false, errors: extractFieldErrors(parsed.error) }
}

// Per-field validation for live feedback
export function validateRegisterField<K extends keyof RegisterInput>(field: K, value: RegisterInput[K]): string | undefined {
  const single = RegisterSchema.pick({ [field]: true } as any)
  const res = single.safeParse({ [field]: value })
  if (res.success) return undefined
  const issue = res.error.issues[0]
  return issue?.message || 'Invalid value'
}

// --- Login ---
export const LoginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, 'Username or Email is required'),
  password: z.string().min(6, MSG.passwordLengthExactly)
})
export type LoginInput = z.infer<typeof LoginSchema>
export function validateLogin(input: LoginInput) { const r = LoginSchema.safeParse(input); return r.success ? { valid: true as const } : { valid: false as const, errors: extractFieldErrors(r.error) } }
export function validateLoginField<K extends keyof LoginInput>(field: K, value: LoginInput[K]) { const r = LoginSchema.pick({ [field]: true } as any).safeParse({ [field]: value }); return r.success ? undefined : r.error.issues[0]?.message || 'Invalid value' }

// --- Students (Create/Edit) ---
// NOTE: The previous implementation attempted to call .pick() on a refined schema (ZodEffects),
// which does not expose .pick(), causing runtime error: "StudentSchemaBase.pick is not a function".
// To fix this we keep an unrefined base object schema for per-field validation and build the
// full form schema (with date/age refinements) separately.
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

// Raw object schema (no cross-field or advanced refinements) used for safe .pick()
const StudentObjectSchema = z.object({
  guardianId: z.string().trim().min(1, MSG.guardianRequired),
  childName: z.string().trim().min(1, MSG.childNameRequired),
  childDob: z.string().trim().min(1, MSG.dobRequired).regex(dateRegex, MSG.dateFormat),
  hobbies: z.string().optional().or(z.literal('')),
  needs: z.array(z.string()).optional(),
  needsOtherText: z.string().optional().or(z.literal(''))
})

// Full form schema with date-based refinements
export const StudentSchemaBase = StudentObjectSchema
  // No future dates
  .refine(v => {
    if (!v.childDob || !dateRegex.test(v.childDob)) return true
    const [y, m, d] = v.childDob.split('-').map(n => Number(n))
    const dob = new Date(y, m - 1, d)
    if (isNaN(dob.getTime())) return true
    const today = new Date()
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return dob <= todayOnly
  }, { path: ['childDob'], message: MSG.dobNoFuture })
  // Min age: at least 4
  .refine(v => {
    if (!v.childDob || !dateRegex.test(v.childDob)) return true
    const [y, m, d] = v.childDob.split('-').map(n => Number(n))
    const dob = new Date(y, m - 1, d)
    if (isNaN(dob.getTime())) return true
    const today = new Date()
    const cutoff = new Date(today.getFullYear() - 4, today.getMonth(), today.getDate())
    return dob <= cutoff
  }, { path: ['childDob'], message: MSG.dobMinAge4 })
  // Max age: at most 15
  .refine(v => {
    if (!v.childDob || !dateRegex.test(v.childDob)) return true
    const [y, m, d] = v.childDob.split('-').map(n => Number(n))
    const dob = new Date(y, m - 1, d)
    if (isNaN(dob.getTime())) return true
    const today = new Date()
    const lowerBound = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate())
    return dob >= lowerBound
  }, { path: ['childDob'], message: MSG.dobMaxAge15 })

export const StudentSchema = StudentSchemaBase.refine(v => (v.needs && v.needs.length > 0) || (v.needsOtherText && v.needsOtherText.trim().length > 0), {
  path: ['needs'],
  message: 'Please select at least one need (or specify Other).'
})

export type StudentInput = z.infer<typeof StudentSchema>

export function validateStudent(input: StudentInput) {
  const r = StudentSchema.safeParse(input)
  return r.success ? { valid: true as const } : { valid: false as const, errors: extractFieldErrors(r.error) }
}

export function validateStudentField<K extends keyof StudentInput>(field: K, value: StudentInput[K]) {
  // Start with raw single-field schema
  const single = StudentObjectSchema.pick({ [field]: true } as any)
  const base = single.safeParse({ [field]: value })
  if (!base.success) return base.error.issues[0]?.message || 'Invalid value'

  // Additional date/age constraints for childDob applied manually for field-level feedback
  if (field === 'childDob') {
    const v = String(value)
    if (dateRegex.test(v)) {
      const [y, m, d] = v.split('-').map(n => Number(n))
      const dob = new Date(y, m - 1, d)
      if (!isNaN(dob.getTime())) {
        const today = new Date()
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        if (dob > todayOnly) return MSG.dobNoFuture
        const cutoffMin = new Date(today.getFullYear() - 4, today.getMonth(), today.getDate())
        if (dob > cutoffMin) return MSG.dobMinAge4
        const cutoffMaxLowerBound = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate())
        if (dob < cutoffMaxLowerBound) return MSG.dobMaxAge15
      }
    }
  }
  return undefined
}

// --- Reports ---
export const ReportSchema = z.object({
  studentId: z.string().trim().min(1, 'Student is required'),
  teacherId: z.string().trim().min(1, 'Teacher is required'),
  term: z.string().optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')).refine(v => !v || dateRegex.test(v), MSG.dateFormat),
  comments: z.string().optional().or(z.literal('')),
  improvementPlan: z.string().optional().or(z.literal(''))
})
export type ReportInput = z.infer<typeof ReportSchema>
export function validateReport(input: ReportInput) { const r = ReportSchema.safeParse(input); return r.success ? { valid: true as const } : { valid: false as const, errors: extractFieldErrors(r.error) } }
export function validateReportField<K extends keyof ReportInput>(field: K, value: ReportInput[K]) { const r = ReportSchema.pick({ [field]: true } as any).safeParse({ [field]: value }); return r.success ? undefined : r.error.issues[0]?.message || 'Invalid value' }

// --- Appointment (simple contact form) ---
export const AppointmentSchema = z.object({
  name: z.string().trim().min(1, MSG.fullNameRequired),
  email: z.string().trim().optional().or(z.literal('')).refine(v => !v || z.string().email(MSG.invalidEmail).safeParse(v).success, MSG.invalidEmail),
  phone: z.string().trim().optional().or(z.literal('')).refine(v => !v || isPhone(v), MSG.phoneInvalid),
  message: z.string().trim().min(1, MSG.messageRequired)
})
export type AppointmentInput = z.infer<typeof AppointmentSchema>
export function validateAppointment(input: AppointmentInput) { const r = AppointmentSchema.safeParse(input); return r.success ? { valid: true as const } : { valid: false as const, errors: extractFieldErrors(r.error) } }
export function validateAppointmentField<K extends keyof AppointmentInput>(field: K, value: AppointmentInput[K]) { const r = AppointmentSchema.pick({ [field]: true } as any).safeParse({ [field]: value }); return r.success ? undefined : r.error.issues[0]?.message || 'Invalid value' }
