export const MSG = {
  // Generic
  fixFields: 'Please fix the form errors and try again.',
  enterCredentials: 'Please enter your credentials.',

  // Fields
  usernameRequired: 'Username is required',
  emailRequired: 'Email is required',
  invalidEmail: 'Please enter a valid email address',
  passwordRequired: 'Password is required',
  passwordLengthExactly: 'Password must be at least 6 characters',
  phoneInvalid: 'Please enter a valid phone number',
  fullNameRequired: 'Full name is required',
  messageRequired: 'Message is required',
  guardianRequired: 'Guardian is required',
  childNameRequired: 'Child name is required',
  dobRequired: 'Date of birth is required',
  dateFormat: 'Use format YYYY-MM-DD',
  dobMinAge4: 'Child must be at least 4 years old',
  dobMaxAge15: 'Child must be at most 15 years old',
  dobNoFuture: 'Date of birth cannot be in the future',
  addressRequired: 'Address is required',

  // Actions / Toasts
  accountCreated: 'Account created',
  loggedIn: 'Logged in',
  reportCreated: 'Report created',
  studentUpdated: 'Student updated',
  studentCreated: 'Student registered',
  studentDeleted: 'Student deleted',
  apptSent: 'Appointment request sent. We will contact you soon.',
  sessionExpired: 'Your session expired. Please login again.'
} as const

export type MsgKey = keyof typeof MSG

