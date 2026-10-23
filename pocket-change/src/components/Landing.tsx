import { useState } from 'react'
import type { PublicBill, Stats } from '../../shared/types'
import { api } from '../api'
import { usePolling } from '../lib/hooks'
import { formatCents } from '../lib/money'
import { href } from '../lib/router'
import { isoDateFromToday } from '../lib/time'
import { BillCard } from './BillCard'
import { PaymentFeed } from './PaymentFeed'

const demoBill = (overrides: Partial<PublicBill>): PublicBill => ({
  id: 'demo',
  title: 'October electricity',
  payee: 'Metro Power & Light',
  amountCents: 14_217,
  dueDate: isoDateFromToday(3),
  category: 'utilities',
  plea: 'My cat has discovered the space heater and I have lost every negotiation since.',
  submitterName: 'Dana',
  attachment: null,
  createdAt: new Date().toISOString(),
  status: 'open',
  paidBy: null,
  passCount: 2,
  sample: false,
  ...overrides,
})

const DEMO_BILLS = [
  demoBill({}),
  demoBill({
    id: 'demo-2',
    title: 'Emergency vet visit',
    payee: 'Paws & Claws Animal Hospital',
    amountCents: 32_000,
    category: 'pet',
    submitterName: 'Luis',
  }),
]

const STEPS = [
  {
    emoji: '📸',
    title: 'Snap your bill',
    text: 'Photo or PDF. Black out your account number with the built-in redaction marker.',
  },
  {
    emoji: '🥱',
    title: 'A billionaire gets bored',
    text: 'Your bill lands in a deck of real bills from real people, sorted by how soon they are due.',
  },
  {
    emoji: '💸',
    title: 'They swipe right',
    text: 'One swipe and it is paid. They earn it back in about a second. You get confetti.',
  },
]

export function Landing() {
  const [stats, setStats] = useState<Stats | null>(null)
  usePolling(async () => {
    try {
      setStats(await api.stats())
    } catch {
      // The landing page still works without live numbers.
    }
  }, 10_000)

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Bill pay, but make it someone else’s problem</p>
          <h1 className="hero__title">
            Your bills are <em>their pocket change.</em>
          </h1>
          <p className="hero__lede">
            Upload a bill. A bored billionaire swipes right. It is paid before they finish yawning.
          </p>
          <div className="doors">
            <a className="door door--bills" href={href('/bills/new')}>
              <span className="door__kicker">I have bills</span>
              <span className="door__title">Upload a bill</span>
              <span className="door__arrow" aria-hidden="true">
                →
              </span>
            </a>
            <a className="door door--billions" href={href('/billions')}>
              <span className="door__kicker">I have billions</span>
              <span className="door__title">Start swiping</span>
              <span className="door__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>
          {stats && (
            <dl className="ticker">
              <div>
                <dt>Paid so far</dt>
                <dd>{formatCents(stats.totalPaidCents)}</dd>
              </div>
              <div>
                <dt>Bills paid</dt>
                <dd>{stats.billsPaid}</dd>
              </div>
              <div>
                <dt>In the deck</dt>
                <dd>{stats.openBills}</dd>
              </div>
            </dl>
          )}
        </div>
        <div className="hero__demo" aria-hidden="true">
          <div className="demo-stack">
            <div className="demo-stack__card demo-stack__card--back">
              <BillCard bill={DEMO_BILLS[1]} />
            </div>
            <div className="demo-stack__card demo-stack__card--front">
              <BillCard bill={DEMO_BILLS[0]} />
              <span className="stamp stamp--pay demo-stack__stamp">Paid</span>
            </div>
          </div>
        </div>
      </section>

      <section className="steps" aria-labelledby="how-heading">
        <h2 id="how-heading" className="section-title section-title--center">
          How it works
        </h2>
        <ol className="steps__list">
          {STEPS.map((step, index) => (
            <li key={step.title} className="step-card">
              <span className="step-card__emoji" aria-hidden="true">
                {step.emoji}
              </span>
              <span className="step-card__number">Step {index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {stats && stats.recent.length > 0 && (
        <section className="landing__feed" aria-labelledby="feed-heading">
          <div className="landing__feed-head">
            <h2 id="feed-heading" className="section-title">
              Just paid
            </h2>
            <a href={href('/leaderboard')}>See the Generosity Index →</a>
          </div>
          <PaymentFeed items={stats.recent.slice(0, 5)} />
        </section>
      )}
    </div>
  )
}
