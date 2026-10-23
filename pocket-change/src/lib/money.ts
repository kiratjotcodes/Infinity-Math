/** A billionaire's money grows about this fast while they sit around being bored. */
export const ANNUAL_RETURN = 0.08
const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60
/** Median US household net worth (Federal Reserve Survey of Consumer Finances, 2022). */
export const MEDIAN_HOUSEHOLD_NET_WORTH_CENTS = 19_290_000

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export const formatCents = (cents: number) => usd.format(cents / 100)
export const formatWholeDollars = (cents: number) => usdWhole.format(Math.floor(cents / 100))
export const formatCompact = (cents: number) => usdCompact.format(cents / 100)

/** Parses what people type into an amount box ("$1,450", "142.17") into cents. */
export function parseDollars(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export const earningsPerSecondCents = (netWorthCents: number) =>
  (netWorthCents * ANNUAL_RETURN) / SECONDS_PER_YEAR

/** How long the billionaire's money takes to earn back what they just spent. */
export const earnBackSeconds = (amountCents: number, netWorthCents: number) =>
  amountCents / earningsPerSecondCents(netWorthCents)

/** Net worth right now: what they started with, minus what they gave, plus what it has earned. */
export function liveNetWorthCents(
  netWorthCents: number,
  totalPaidCents: number,
  createdAt: string,
  now: number,
): number {
  const seconds = Math.max(0, (now - Date.parse(createdAt)) / 1000)
  return netWorthCents - totalPaidCents + earningsPerSecondCents(netWorthCents) * seconds
}

/** Formats a fraction too small for normal humans, e.g. 0.00000028%. */
export function formatTinyPercent(fraction: number): string {
  const percent = fraction * 100
  if (percent === 0) return '0%'
  if (percent >= 0.01) return `${percent.toFixed(2)}%`
  const decimals = Math.min(20, 1 - Math.floor(Math.log10(percent)))
  return `${percent.toFixed(decimals)}%`
}

export function formatDuration(seconds: number): string {
  const units: Array<[number, string]> = [
    [86_400, 'day'],
    [3_600, 'hour'],
    [60, 'minute'],
  ]
  const plural = (amount: number, unit: string) => `${amount} ${unit}${amount === 1 ? '' : 's'}`
  for (const [size, unit] of units) {
    if (seconds >= size) {
      const value = seconds / size
      return plural(value < 10 ? Number(value.toFixed(1)) : Math.round(value), unit)
    }
  }
  if (seconds >= 10) return plural(Math.round(seconds), 'second')
  return plural(Number(seconds.toFixed(seconds < 0.1 ? 2 : 1)), 'second')
}

/** What this payment would feel like to a household with median net worth. */
export function householdEquivalent(amountCents: number, netWorthCents: number): string {
  const cents = (amountCents / netWorthCents) * MEDIAN_HOUSEHOLD_NET_WORTH_CENTS
  if (cents >= 100) return formatCents(cents)
  if (cents >= 0.01) return `${Number(cents.toPrecision(2))}¢`
  return 'less than a hundredth of a cent'
}
