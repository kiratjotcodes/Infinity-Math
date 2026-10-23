import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { NewBillInput } from '../shared/types.ts'
import { ApiError, createStore, emptyState, openStore } from './store.ts'

const NOW = new Date('2026-10-23T12:00:00Z')
const OWNER = 'o'.repeat(40)

const bill = (overrides: Partial<NewBillInput> = {}): Partial<NewBillInput> => ({
  title: 'October electricity',
  payee: 'Metro Power & Light',
  amountCents: 14_217,
  dueDate: '2026-10-30',
  category: 'utilities',
  plea: 'My cat discovered the space heater.',
  submitterName: 'Dana',
  attachmentId: null,
  ...overrides,
})

function setup() {
  const store = createStore(emptyState(), { now: () => NOW })
  const alice = store.createBillionaire({
    name: 'Alice Aurum',
    avatar: '🎩',
    wealthSource: 'Yachts, mostly',
    netWorthCents: 5_000_000_000_000,
  })
  const bob = store.createBillionaire({
    name: 'Bob Bullion',
    avatar: '🦈',
    wealthSource: 'Crypto (please do not ask)',
    netWorthCents: 2_000_000_000_000,
  })
  return { store, alice, bob }
}

function expectApiError(run: () => unknown, status: number) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(status)
    return
  }
  throw new Error('Expected an ApiError')
}

describe('bills', () => {
  it('creates a bill and tidies its text', () => {
    const { store } = setup()
    const created = store.createBill(OWNER, bill({ title: '  October\n electricity ' }))
    expect(created).toMatchObject({
      title: 'October electricity',
      status: 'open',
      paidBy: null,
      passCount: 0,
      sample: false,
    })
    expect(store.billsFor(OWNER).map((item) => item.id)).toEqual([created.id])
    expect(store.billsFor('x'.repeat(40))).toEqual([])
  })

  it('rejects bills a billionaire could not reasonably pay', () => {
    const { store } = setup()
    expectApiError(() => store.createBill(OWNER, bill({ amountCents: 50 })), 400)
    expectApiError(() => store.createBill(OWNER, bill({ amountCents: 14.5 })), 400)
    expectApiError(() => store.createBill(OWNER, bill({ amountCents: 20_000_000 })), 400)
    expectApiError(() => store.createBill(OWNER, bill({ dueDate: '2026-02-30' })), 400)
    expectApiError(() => store.createBill(OWNER, bill({ dueDate: '2029-01-01' })), 400)
    expectApiError(() => store.createBill(OWNER, bill({ category: 'yacht' as never })), 400)
    expectApiError(() => store.createBill(OWNER, bill({ plea: '   ' })), 400)
    expectApiError(() => store.createBill(OWNER, bill({ plea: 'a'.repeat(281) })), 400)
    expectApiError(() => store.createBill('short', bill()), 401)
  })

  it('only attaches an upload once', () => {
    const { store } = setup()
    const upload = store.addAttachment('image/jpeg', 1234)
    const created = store.createBill(OWNER, bill({ attachmentId: upload.id }))
    expect(created.attachment).toEqual(upload)
    expectApiError(() => store.createBill(OWNER, bill({ attachmentId: upload.id })), 400)
    expectApiError(() => store.createBill(OWNER, bill({ attachmentId: 'missing' })), 400)
  })

  it('lets owners withdraw unpaid bills only', () => {
    const { store, alice } = setup()
    const first = store.createBill(OWNER, bill())
    const second = store.createBill(OWNER, bill({ title: 'Rent' }))
    expectApiError(() => store.withdrawBill('x'.repeat(40), first.id), 404)
    expect(store.withdrawBill(OWNER, first.id)).toBeNull()
    expect(store.billsFor(OWNER).map((item) => item.id)).toEqual([second.id])

    store.swipe(alice.token, second.id, 'right')
    expectApiError(() => store.withdrawBill(OWNER, second.id), 409)
  })
})

describe('swiping', () => {
  it('pays a bill on the first right swipe and credits the billionaire', () => {
    const { store, alice, bob } = setup()
    const created = store.createBill(OWNER, bill())

    const paid = store.swipe(alice.token, created.id, 'right')
    expect(paid.outcome).toBe('paid')
    expect(paid.bill.status).toBe('paid')
    expect(paid.bill.paidBy).toMatchObject({ name: 'Alice Aurum', house: false })
    expect(paid.billionaire).toMatchObject({ billsPaid: 1, totalPaidCents: 14_217 })

    const late = store.swipe(bob.token, created.id, 'right')
    expect(late.outcome).toBe('already-paid')
    expect(late.bill.paidBy?.name).toBe('Alice Aurum')
    expect(late.billionaire.billsPaid).toBe(0)
  })

  it('counts passes and refuses to swipe twice', () => {
    const { store, alice, bob } = setup()
    const created = store.createBill(OWNER, bill())
    expect(store.swipe(alice.token, created.id, 'left').bill.passCount).toBe(1)
    expect(store.swipe(bob.token, created.id, 'left').bill.passCount).toBe(2)
    expectApiError(() => store.swipe(alice.token, created.id, 'right'), 409)
    expectApiError(() => store.swipe(alice.token, created.id, 'up'), 400)
    expectApiError(() => store.swipe(alice.token, 'nope', 'right'), 404)
    expectApiError(() => store.swipe(undefined, created.id, 'right'), 401)
  })

  it('deals real bills first, most urgent first, and never repeats one', () => {
    const { store, alice, bob } = setup()
    store.addSampleBill({ ...bill({ dueDate: '2026-10-24' }), title: 'Sample' } as never)
    const later = store.createBill(OWNER, bill({ title: 'Later', dueDate: '2026-11-15' }))
    const sooner = store.createBill(OWNER, bill({ title: 'Sooner', dueDate: '2026-10-25' }))
    expect(store.deck(alice.token).map((item) => item.title)).toEqual(['Sooner', 'Later', 'Sample'])

    store.swipe(alice.token, sooner.id, 'left')
    store.swipe(bob.token, later.id, 'right')
    expect(store.deck(alice.token).map((item) => item.title)).toEqual(['Sample'])
    expect(store.deck(bob.token).map((item) => item.title)).toEqual(['Sooner', 'Sample'])
  })

  it('keeps house billionaires on autopilot only', () => {
    const { store, alice } = setup()
    const house = store.addHouseBillionaire({
      name: 'House',
      avatar: '🐉',
      wealthSource: 'Simulation',
      netWorthCents: 1_000_000_000_000,
    })
    const created = store.createBill(OWNER, bill())
    expectApiError(() => store.swipeAsHouse(alice.billionaire.id, created.id, 'right'), 403)
    expect(store.swipeAsHouse(house.id, created.id, 'right').bill.paidBy?.house).toBe(true)
  })
})

describe('stats and portfolio', () => {
  it('ranks billionaires by generosity', () => {
    const { store, alice, bob } = setup()
    const small = store.createBill(OWNER, bill({ amountCents: 1_000 }))
    const big = store.createBill(OWNER, bill({ amountCents: 90_000 }))
    store.createBill(OWNER, bill())
    store.swipe(alice.token, small.id, 'right')
    store.swipe(bob.token, big.id, 'right')

    const stats = store.stats()
    expect(stats).toMatchObject({ totalPaidCents: 91_000, billsPaid: 2, openBills: 1, billionaires: 2 })
    expect(stats.leaderboard.map((entry) => entry.name)).toEqual(['Bob Bullion', 'Alice Aurum'])
    expect(stats.recent).toHaveLength(2)
    expect(store.portfolio(alice.token).bills.map((item) => item.id)).toEqual([small.id])
  })
})

describe('persistence', () => {
  it('survives a restart', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pocket-change-'))
    const file = path.join(dir, 'db.json')
    try {
      const first = openStore(file, emptyState)
      const session = first.createBillionaire({
        name: 'Persistent Pat',
        avatar: '👑',
        wealthSource: 'Yachts, mostly',
        netWorthCents: 1_000_000_000_000,
      })
      const created = first.createBill(OWNER, bill())
      first.swipe(session.token, created.id, 'right')

      const second = openStore(file, () => {
        throw new Error('should not reseed')
      })
      expect(second.billionaire(session.token).billsPaid).toBe(1)
      expect(second.billsFor(OWNER)[0].status).toBe('paid')
      expect(fs.readFileSync(file, 'utf8')).not.toContain(session.token)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
