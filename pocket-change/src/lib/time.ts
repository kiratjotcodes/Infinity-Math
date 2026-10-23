const DAY_MS = 86_400_000

/** Whole calendar days from today (local time) until an ISO date like 2026-10-31. */
export function daysUntil(isoDate: string, now = new Date()): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  const due = Date.UTC(year, month - 1, day)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((due - today) / DAY_MS)
}

export function dueLabel(isoDate: string, now = new Date()): { text: string; urgent: boolean } {
  const days = daysUntil(isoDate, now)
  if (days < -1) return { text: `${-days} days overdue`, urgent: true }
  if (days === -1) return { text: '1 day overdue', urgent: true }
  if (days === 0) return { text: 'Due today', urgent: true }
  if (days === 1) return { text: 'Due tomorrow', urgent: true }
  return { text: `Due in ${days} days`, urgent: days <= 3 }
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, (now - Date.parse(iso)) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function isoDateFromToday(days: number, now = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
