import { describe, expect, it } from 'vitest'
import { daysUntil, dueLabel, isoDateFromToday, timeAgo } from './time'

const NOW = new Date(2026, 9, 23, 18, 30)

describe('due dates', () => {
  it('counts calendar days, not hours', () => {
    expect(daysUntil('2026-10-23', NOW)).toBe(0)
    expect(daysUntil('2026-10-24', NOW)).toBe(1)
    expect(daysUntil('2026-11-01', NOW)).toBe(9)
    expect(daysUntil('2026-10-20', NOW)).toBe(-3)
  })

  it('labels urgency', () => {
    expect(dueLabel('2026-10-20', NOW)).toEqual({ text: '3 days overdue', urgent: true })
    expect(dueLabel('2026-10-22', NOW)).toEqual({ text: '1 day overdue', urgent: true })
    expect(dueLabel('2026-10-23', NOW)).toEqual({ text: 'Due today', urgent: true })
    expect(dueLabel('2026-10-24', NOW)).toEqual({ text: 'Due tomorrow', urgent: true })
    expect(dueLabel('2026-10-26', NOW)).toEqual({ text: 'Due in 3 days', urgent: true })
    expect(dueLabel('2026-11-15', NOW)).toEqual({ text: 'Due in 23 days', urgent: false })
  })

  it('builds local ISO dates', () => {
    expect(isoDateFromToday(0, NOW)).toBe('2026-10-23')
    expect(isoDateFromToday(9, NOW)).toBe('2026-11-01')
  })
})

describe('timeAgo', () => {
  it('rounds to something readable', () => {
    const now = Date.parse('2026-10-23T12:00:00Z')
    expect(timeAgo('2026-10-23T11:59:40Z', now)).toBe('just now')
    expect(timeAgo('2026-10-23T11:55:00Z', now)).toBe('5m ago')
    expect(timeAgo('2026-10-23T09:00:00Z', now)).toBe('3h ago')
    expect(timeAgo('2026-10-20T12:00:00Z', now)).toBe('3d ago')
  })
})
