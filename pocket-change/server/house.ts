import type { SwipeResult } from '../shared/types.ts'
import { SAMPLE_BILLS, sampleBill } from './seed.ts'
import type { BillRecord, Store } from './store.ts'

const DAY_MS = 86_400_000

export interface HouseOptions {
  /** Average time between house swipes. */
  intervalMs: number
  /** House billionaires wait this long before looking at a new bill, giving humans first dibs. */
  graceMs: number
  /** Nobody has used the API for this long, so the house stops swiping too. */
  idleAfterMs: number
  /** Top the deck back up with a sample bill whenever fewer than this many are open. */
  minOpenBills: number
  keepPaidSamples: number
}

export const HOUSE_DEFAULTS: HouseOptions = {
  intervalMs: 9_000,
  graceMs: 20_000,
  idleAfterMs: 15 * 60_000,
  minOpenBills: 8,
  keepPaidSamples: 60,
}

/** How likely a bored billionaire is to swipe right. Small, urgent, well-pitched bills do best. */
export function payChance(
  bill: Pick<BillRecord, 'amountCents' | 'dueDate' | 'plea'>,
  now: Date,
): number {
  let chance = 0.45
  if (bill.amountCents <= 30_000) chance += 0.15
  if (bill.amountCents >= 200_000) chance -= 0.2
  if (bill.plea.length >= 60) chance += 0.1
  const daysLeft = (Date.parse(`${bill.dueDate}T00:00:00Z`) - now.getTime()) / DAY_MS
  if (daysLeft <= 2) chance += 0.1
  return Math.min(0.85, Math.max(0.15, chance))
}

/** One house billionaire looks at one bill. Returns null when there is nothing for them to do. */
export function houseTick(
  store: Store,
  rng: () => number = Math.random,
  options: HouseOptions = HOUSE_DEFAULTS,
): SwipeResult | null {
  const now = store.now()
  const open = store.read().bills.filter((bill) => !bill.paidById)
  if (open.length < options.minOpenBills) {
    const showing = new Set(open.map((bill) => bill.title))
    const fresh = SAMPLE_BILLS.filter((template) => !showing.has(template.title))
    const template = fresh[Math.floor(rng() * fresh.length)]
    if (template) {
      store.addSampleBill(sampleBill({ ...template, dueInDays: Math.floor(rng() * 14) - 1 }, now))
    }
  }
  store.pruneSampleBills(options.keepPaidSamples)

  const { bills, billionaires, swipes } = store.read()
  const house = billionaires.filter((billionaire) => billionaire.house)
  const swipedBy = new Map<string, Set<string>>()
  for (const swipe of swipes) {
    const seen = swipedBy.get(swipe.billId) ?? new Set<string>()
    seen.add(swipe.billionaireId)
    swipedBy.set(swipe.billId, seen)
  }

  const candidates = bills
    .filter(
      (bill) =>
        !bill.paidById && now.getTime() - Date.parse(bill.createdAt) >= options.graceMs,
    )
    .map((bill) => {
      const seen = swipedBy.get(bill.id) ?? new Set<string>()
      return { bill, seen: seen.size, available: house.filter((billionaire) => !seen.has(billionaire.id)) }
    })
    .filter((candidate) => candidate.available.length > 0)
    // Real people's bills first, then whichever bill has had the least attention.
    .sort((a, b) => Number(a.bill.sample) - Number(b.bill.sample) || a.seen - b.seen)
  if (!candidates.length) return null

  const best = candidates.filter(
    (candidate) =>
      candidate.bill.sample === candidates[0].bill.sample && candidate.seen === candidates[0].seen,
  )
  const { bill, available } = best[Math.floor(rng() * best.length)]
  const billionaire = available[Math.floor(rng() * available.length)]
  const direction = rng() < payChance(bill, now) ? 'right' : 'left'
  return store.swipeAsHouse(billionaire.id, bill.id, direction)
}

/** Lets the house billionaires swipe in the background. Returns a function that stops them. */
export function startHouseBillionaires(
  store: Store,
  options: HouseOptions = HOUSE_DEFAULTS,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    timer = setTimeout(tick, options.intervalMs * (0.6 + Math.random() * 0.8))
    timer.unref()
  }
  const tick = () => {
    try {
      if (store.idleForMs() < options.idleAfterMs) houseTick(store, Math.random, options)
    } catch (error) {
      console.error('House billionaire tripped over a yacht:', error)
    }
    schedule()
  }
  schedule()
  return () => clearTimeout(timer)
}
