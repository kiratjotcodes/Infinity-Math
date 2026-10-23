import { describe, expect, it } from 'vitest'
import { HOUSE_DEFAULTS, houseTick, payChance } from './house.ts'
import { HOUSE_BILLIONAIRES, seedState } from './seed.ts'
import { createStore, emptyState } from './store.ts'

const NOW = new Date('2026-10-23T12:00:00Z')
const OWNER = 'o'.repeat(40)

function sequence(...values: number[]) {
  let index = 0
  return () => values[index++ % values.length]
}

describe('seedState', () => {
  it('starts the world with open and paid sample bills', () => {
    const store = createStore(seedState(NOW, sequence(0.3, 0.7, 0.1, 0.9)), { now: () => NOW })
    const stats = store.stats()
    expect(stats.billionaires).toBe(HOUSE_BILLIONAIRES.length)
    expect(stats.billsPaid).toBeGreaterThan(0)
    expect(stats.openBills).toBeGreaterThan(5)
    expect(store.read().bills.every((bill) => bill.sample && bill.createdAt < NOW.toISOString())).toBe(true)
  })
})

describe('payChance', () => {
  it('favours small, urgent, well-pitched bills', () => {
    const pitch = 'A plea long enough to tug at the heartstrings of a person who owns three islands.'
    const easy = payChance({ amountCents: 4_500, dueDate: '2026-10-23', plea: pitch }, NOW)
    const hard = payChance({ amountCents: 900_000, dueDate: '2027-01-01', plea: 'pls' }, NOW)
    expect(easy).toBeGreaterThan(0.7)
    expect(hard).toBeLessThan(0.3)
  })
})

describe('houseTick', () => {
  function world() {
    let clock = NOW.getTime()
    const store = createStore(emptyState(), { now: () => new Date(clock) })
    for (const billionaire of HOUSE_BILLIONAIRES.slice(0, 2)) store.addHouseBillionaire(billionaire)
    const advance = (ms: number) => {
      clock += ms
    }
    return { store, advance }
  }

  const bill = {
    title: 'Rent',
    payee: 'Landlord',
    amountCents: 120_000,
    dueDate: '2026-10-30',
    category: 'rent' as const,
    plea: 'Please.',
    submitterName: 'Sam',
    attachmentId: null,
  }

  it('gives humans a head start, then looks at real bills first', () => {
    const { store, advance } = world()
    const options = { ...HOUSE_DEFAULTS, minOpenBills: 0 }
    const real = store.createBill(OWNER, bill)
    expect(houseTick(store, sequence(0), options)).toBeNull()

    advance(HOUSE_DEFAULTS.graceMs)
    store.addSampleBill({ ...bill, title: 'Sample' })
    const first = houseTick(store, sequence(0), options)
    expect(first?.bill.id).toBe(real.id)
    expect(first?.outcome).toBe('paid')
  })

  it('passes when the dice say so and stops once every house billionaire has looked', () => {
    const { store, advance } = world()
    const options = { ...HOUSE_DEFAULTS, minOpenBills: 0 }
    store.createBill(OWNER, bill)
    advance(HOUSE_DEFAULTS.graceMs)
    expect(houseTick(store, sequence(0.99), options)?.outcome).toBe('passed')
    expect(houseTick(store, sequence(0.99), options)?.outcome).toBe('passed')
    expect(houseTick(store, sequence(0.99), options)).toBeNull()
  })

  it('tops the deck up with sample bills', () => {
    const { store } = world()
    houseTick(store, sequence(0.5), { ...HOUSE_DEFAULTS, minOpenBills: 3 })
    houseTick(store, sequence(0.1), { ...HOUSE_DEFAULTS, minOpenBills: 3 })
    const titles = store.read().bills.map((item) => item.title)
    expect(titles).toHaveLength(2)
    expect(new Set(titles).size).toBe(2)
  })
})
