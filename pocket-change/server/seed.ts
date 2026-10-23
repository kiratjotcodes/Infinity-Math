import type { NewBillionaireInput } from '../shared/types.ts'
import { createStore, emptyState } from './store.ts'
import type { DbState, SampleBillInput } from './store.ts'

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

/** Fictional, simulated billionaires who keep the demo lively. They are labelled "house" in the UI. */
export const HOUSE_BILLIONAIRES: NewBillionaireInput[] = [
  {
    name: 'Chad Moneybags III',
    avatar: '🎩',
    wealthSource: 'Inherited it from a guy who inherited it',
    netWorthCents: 8_400_000_000_000,
  },
  {
    name: 'Baroness von Liquidity',
    avatar: '🛥️',
    wealthSource: 'Yachts, mostly',
    netWorthCents: 21_200_000_000_000,
  },
  {
    name: 'Kyle "Disrupt" Brenner',
    avatar: '🦄',
    wealthSource: 'An app that does what another app does',
    netWorthCents: 3_100_000_000_000,
  },
  {
    name: 'Dame Prudence Ledger',
    avatar: '🐉',
    wealthSource: 'Bought low, sold high, repeated forever',
    netWorthCents: 5_700_000_000_000,
  },
  {
    name: 'Countess Esmé Carat',
    avatar: '💎',
    wealthSource: 'Diamonds, allegedly ethical',
    netWorthCents: 1_900_000_000_000,
  },
  {
    name: 'Thaddeus Sharkwell',
    avatar: '🦈',
    wealthSource: 'Private equity (he bought your dentist)',
    netWorthCents: 4_600_000_000_000,
  },
  {
    name: 'Zeke Orbitron',
    avatar: '🚀',
    wealthSource: 'Rocket-adjacent ventures',
    netWorthCents: 12_800_000_000_000,
  },
]

type SampleTemplate = Omit<SampleBillInput, 'dueDate'> & { dueInDays: number }

export const SAMPLE_BILLS: SampleTemplate[] = [
  {
    submitterName: 'Dana',
    title: 'October electricity',
    payee: 'Metro Power & Light',
    amountCents: 14_217,
    category: 'utilities',
    dueInDays: 4,
    plea: 'My cat has discovered the space heater and I have lost every negotiation since.',
  },
  {
    submitterName: 'Marcus',
    title: 'Rent (all of it)',
    payee: 'Greenleaf Property Management',
    amountCents: 145_000,
    category: 'rent',
    dueInDays: 8,
    plea: 'My landlord said "have you tried being a billionaire?" so I am networking.',
  },
  {
    submitterName: 'Priya',
    title: 'Wisdom teeth removal',
    payee: 'Bright Smile Oral Surgery',
    amountCents: 61_240,
    category: 'medical',
    dueInDays: 12,
    plea: 'They took four teeth and, it turns out, my entire savings account.',
  },
  {
    submitterName: 'Jo',
    title: 'Student loan payment',
    payee: 'Eternal Loan Servicing Co.',
    amountCents: 38_900,
    category: 'student-loans',
    dueInDays: 2,
    plea: 'I have a degree in medieval poetry. It has not paid for itself. Yet.',
  },
  {
    submitterName: 'Theo',
    title: 'Car insurance',
    payee: 'Reliable-ish Auto Insurance',
    amountCents: 17_890,
    category: 'car',
    dueInDays: 6,
    plea: 'A deer hit me. Somehow I am the one paying for it. Where is the justice.',
  },
  {
    submitterName: 'Ana',
    title: 'Phone bill',
    payee: 'Bars & Signals Wireless',
    amountCents: 8_500,
    category: 'phone',
    dueInDays: 1,
    plea: 'I need my phone to apply for jobs that ask me to download their app.',
  },
  {
    submitterName: 'Sam',
    title: 'Groceries for the week',
    payee: 'Corner Market Co-op',
    amountCents: 9_633,
    category: 'groceries',
    dueInDays: 0,
    plea: 'I am one more lentil dinner away from becoming a lentil.',
  },
  {
    submitterName: 'Luis',
    title: 'Emergency vet visit',
    payee: 'Paws & Claws Animal Hospital',
    amountCents: 32_000,
    category: 'pet',
    dueInDays: 9,
    plea: 'Biscuit ate a sock. The sock is fine. Biscuit is fine. My wallet is not.',
  },
  {
    submitterName: 'Grace',
    title: 'Home internet',
    payee: 'Fibrous Optics',
    amountCents: 6_499,
    category: 'phone',
    dueInDays: 5,
    plea: 'Working from home requires a home and, crucially, the internet.',
  },
  {
    submitterName: 'Ben',
    title: 'Ambulance ride',
    payee: 'County EMS',
    amountCents: 118_000,
    category: 'medical',
    dueInDays: -3,
    plea: 'It was four miles. A taxi would have been $14, but they do not carry defibrillators.',
  },
  {
    submitterName: 'Mei',
    title: 'Daycare, November',
    payee: 'Little Sprouts Daycare',
    amountCents: 86_000,
    category: 'other',
    dueInDays: 14,
    plea: 'My toddler has a busier social calendar than I ever did, and it costs more.',
  },
  {
    submitterName: 'Ravi',
    title: 'Parking ticket',
    payee: 'City Parking Authority',
    amountCents: 4_500,
    category: 'car',
    dueInDays: -1,
    plea: 'The sign said two-hour parking. It did not say which two hours.',
  },
  {
    submitterName: 'Noor',
    title: 'Water bill',
    payee: 'City Water Department',
    amountCents: 5_812,
    category: 'utilities',
    dueInDays: 10,
    plea: 'I drink a reasonable amount of water. The bill strongly disagrees.',
  },
  {
    submitterName: 'Owen',
    title: 'Laptop repair',
    payee: 'Fix-It Fixers',
    amountCents: 24_000,
    category: 'other',
    dueInDays: 7,
    plea: 'Spilled coffee on it while job hunting. The irony is not lost on me.',
  },
  {
    submitterName: 'Fatima',
    title: 'Prescription refill',
    payee: 'Neighborhood Pharmacy',
    amountCents: 7_285,
    category: 'medical',
    dueInDays: 3,
    plea: 'Same pills as last month, brand new price. Every refill is a surprise party.',
  },
  {
    submitterName: 'Chloe',
    title: 'Gas bill',
    payee: 'Northern Gas Utility',
    amountCents: 12_150,
    category: 'utilities',
    dueInDays: 11,
    plea: 'I boiled pasta once in October. Apparently that is a luxury now.',
  },
]

export function sampleBill(template: SampleTemplate, now: Date): SampleBillInput {
  const { dueInDays, ...fields } = template
  return {
    ...fields,
    dueDate: new Date(now.getTime() + dueInDays * DAY_MS).toISOString().slice(0, 10),
  }
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Builds a first-run world: the house billionaires, a dozen bills, a few already paid. */
export function seedState(now = new Date(), rng: () => number = Math.random): DbState {
  const state = emptyState()
  let clock = now.getTime() - 8 * 60 * MINUTE_MS
  const store = createStore(state, { now: () => new Date(clock) })

  const house = HOUSE_BILLIONAIRES.map((billionaire) => store.addHouseBillionaire(billionaire))
  const bills = SAMPLE_BILLS.slice(0, 13).map((template) => {
    clock += (10 + rng() * 10) * MINUTE_MS
    return store.addSampleBill(sampleBill(template, now))
  })

  bills.forEach((bill, index) => {
    const order = shuffled(house, rng)
    const passes = 1 + Math.floor(rng() * 2)
    for (const billionaire of order.slice(0, passes)) {
      clock += (1 + rng() * 3) * MINUTE_MS
      store.swipeAsHouse(billionaire.id, bill.id, 'left')
    }
    // Every third bill has already found its benefactor, so the leaderboard isn't empty.
    if (index % 3 === 0) {
      clock += (1 + rng() * 3) * MINUTE_MS
      store.swipeAsHouse(order[passes].id, bill.id, 'right')
    }
  })
  return state
}
