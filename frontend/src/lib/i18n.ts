export function formatDate(date: Date, locale?: string) {
  const loc = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US')
  return new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'long', day: '2-digit' }).format(date)
}
