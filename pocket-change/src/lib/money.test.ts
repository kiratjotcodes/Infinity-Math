import { describe, expect, it } from 'vitest'
import {
  earnBackSeconds,
  formatCents,
  formatCompact,
  formatDuration,
  formatTinyPercent,
  householdEquivalent,
  liveNetWorthCents,
  parseDollars,
} from './money'

const FIFTY_BILLION = 5_000_000_000_000

describe('parseDollars', () => {
  it('accepts the ways people type money', () => {
    expect(parseDollars('142.17')).toBe(14_217)
    expect(parseDollars('$1,450')).toBe(145_000)
    expect(parseDollars(' 3.5 ')).toBe(350)
    expect(parseDollars('0.05')).toBe(5)
  })

  it('rejects anything that is not an amount', () => {
    for (const input of ['', 'abc', '1.234', '-5', '1e3', '12.3.4']) {
      expect(parseDollars(input)).toBeNull()
    }
  })
})

describe('formatting', () => {
  it('formats dollars', () => {
    expect(formatCents(14_217)).toBe('$142.17')
    expect(formatCompact(FIFTY_BILLION)).toBe('$50B')
  })

  it('writes tiny percentages without scientific notation', () => {
    expect(formatTinyPercent(14_217 / FIFTY_BILLION)).toBe('0.00000028%')
    expect(formatTinyPercent(0.5)).toBe('50.00%')
    expect(formatTinyPercent(0)).toBe('0%')
  })

  it('formats durations for humans', () => {
    expect(formatDuration(0.042)).toBe('0.04 seconds')
    expect(formatDuration(1)).toBe('1 second')
    expect(formatDuration(1.12)).toBe('1.1 seconds')
    expect(formatDuration(45.4)).toBe('45 seconds')
    expect(formatDuration(90)).toBe('1.5 minutes')
    expect(formatDuration(3_600)).toBe('1 hour')
    expect(formatDuration(86_400 * 12)).toBe('12 days')
  })
})

describe('billionaire maths', () => {
  it('earns back an electricity bill in about a second', () => {
    expect(earnBackSeconds(14_217, FIFTY_BILLION)).toBeCloseTo(1.12, 2)
  })

  it('translates a payment into what it feels like for a median household', () => {
    expect(householdEquivalent(14_217, FIFTY_BILLION)).toBe('0.055¢')
    expect(householdEquivalent(100, 100_000_000_000_000)).toBe('less than a hundredth of a cent')
    expect(householdEquivalent(FIFTY_BILLION / 2, FIFTY_BILLION)).toBe('$96,450.00')
  })

  it('keeps growing net worth even after paying bills', () => {
    const createdAt = '2026-10-23T12:00:00Z'
    const start = Date.parse(createdAt)
    expect(liveNetWorthCents(FIFTY_BILLION, 0, createdAt, start)).toBe(FIFTY_BILLION)
    const afterTenSeconds = liveNetWorthCents(FIFTY_BILLION, 14_217, createdAt, start + 10_000)
    expect(afterTenSeconds).toBeGreaterThan(FIFTY_BILLION)
  })
})
