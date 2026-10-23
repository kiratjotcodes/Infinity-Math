import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AVATARS, LIMITS, WEALTH_SOURCES } from '../../shared/types'
import type { BillionaireSession, PublicBillionaire, SwipeResult } from '../../shared/types'
import { api, ApiRequestError } from '../api'
import { useNow } from '../lib/hooks'
import { billionaireToken, saveBillionaireToken } from '../lib/identity'
import {
  earnBackSeconds,
  formatCents,
  formatCompact,
  formatDuration,
  formatTinyPercent,
  householdEquivalent,
  liveNetWorthCents,
} from '../lib/money'
import { href } from '../lib/router'
import { useFeedback } from './Feedback'
import { SwipeDeck } from './SwipeDeck'

const NET_WORTHS = [
  { cents: 100_000_000_000, note: 'Entry-level' },
  { cents: 1_000_000_000_000, note: 'Has a jet' },
  { cents: 5_000_000_000_000, note: 'Owns a sports team' },
  { cents: 25_000_000_000_000, note: 'Owns the league' },
]

const FIRST = ['Chauncey', 'Penelope', 'Sterling', 'Augustina', 'Montgomery', 'Winifred', 'Cornelius', 'Bunny']
const LAST = ['Goldbottom', 'Vaultsworth', 'McDividend', 'Fortunato', 'Cashington', 'Bullionaire', 'Moneypenny']
const SUFFIX = ['', ' III', ' Jr.', ', Esq.', ' the Fourth']

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]
const randomName = () => `${pick(FIRST)} ${pick(LAST)}${pick(SUFFIX)}`

function BillionaireSetup({ onReady }: { onReady: (session: BillionaireSession) => void }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string>(AVATARS[0])
  const [netWorthCents, setNetWorthCents] = useState(NET_WORTHS[2].cents)
  const [wealthSource, setWealthSource] = useState<string>(WEALTH_SOURCES[0])
  const [sworn, setSworn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function surprise() {
    setName(randomName())
    setAvatar(pick(AVATARS))
    setNetWorthCents(pick(NET_WORTHS).cents)
    setWealthSource(pick(WEALTH_SOURCES))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('The tabloids need something to call you.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      onReady(await api.createBillionaire({ name, avatar, netWorthCents, wealthSource }))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The vault door is stuck.')
      setSaving(false)
    }
  }

  return (
    <section className="setup">
      <p className="eyebrow eyebrow--gold">For the extremely wealthy and extremely bored</p>
      <h1 className="setup__title">Enter the vault</h1>
      <p className="setup__lede">
        Real people, real bills, slightly absurd stories. Swipe right to make one disappear.
      </p>

      <form className="setup__form" onSubmit={submit}>
        <div className="field">
          <div className="field__row">
            <label htmlFor="tycoon-name">What do the tabloids call you?</label>
            <button type="button" className="link-button" onClick={surprise}>
              🎲 Surprise me
            </button>
          </div>
          <input
            id="tycoon-name"
            className="input input--vault"
            value={name}
            maxLength={LIMITS.nameMax}
            placeholder="e.g. The Duke of Dividends"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <fieldset className="field">
          <legend>Pick a portrait for the yacht</legend>
          <div className="avatar-picker">
            {AVATARS.map((option) => (
              <label key={option} className="avatar-option">
                <input
                  type="radio"
                  name="avatar"
                  value={option}
                  checked={avatar === option}
                  onChange={() => setAvatar(option)}
                />
                <span className="avatar-option__glyph">{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Net worth (roughly; who's counting)</legend>
          <div className="choice-grid">
            {NET_WORTHS.map((option) => (
              <label key={option.cents} className="choice">
                <input
                  type="radio"
                  name="net-worth"
                  checked={netWorthCents === option.cents}
                  onChange={() => setNetWorthCents(option.cents)}
                />
                <span className="choice__main">{formatCompact(option.cents)}</span>
                <span className="choice__note">{option.note}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="wealth-source">Source of wealth</label>
          <select
            id="wealth-source"
            className="input input--vault"
            value={wealthSource}
            onChange={(event) => setWealthSource(event.target.value)}
          >
            {WEALTH_SOURCES.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
        </div>

        <label className="oath">
          <input type="checkbox" checked={sworn} onChange={(event) => setSworn(event.target.checked)} />
          <span>I solemnly swear I am a billionaire with absolutely nothing better to do.</span>
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button--gold button--wide" disabled={!sworn || saving}>
          {saving ? 'Opening the vault…' : 'Start swiping'}
        </button>
        <p className="fineprint">
          Honor system. Pocket Change is a demo, so no real money changes hands.
        </p>
      </form>
    </section>
  )
}

function NetWorth({ me }: { me: PublicBillionaire }) {
  const now = useNow(120)
  return (
    <div className="hud__stat">
      <span className="hud__label">Net worth</span>
      <span className="hud__value hud__value--ticker">
        {formatCents(liveNetWorthCents(me.netWorthCents, me.totalPaidCents, me.createdAt, now))}
      </span>
    </div>
  )
}

const BOREDOM_LABELS: Array<[number, string]> = [
  [85, 'Catatonic with ennui'],
  [65, 'Yawning on the yacht'],
  [45, 'Mildly amused'],
  [25, 'Genuinely entertained'],
  [0, 'Feeling something. Is this joy?'],
]

function Boredom({ value }: { value: number }) {
  const label = BOREDOM_LABELS.find(([floor]) => value >= floor)?.[1] ?? ''
  return (
    <div className="hud__stat hud__stat--wide">
      <span className="hud__label">Boredom</span>
      <div
        className="boredom"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-valuetext={label}
      >
        <div className="boredom__fill" style={{ width: `${value}%` }} />
      </div>
      <span className="boredom__label">{label}</span>
    </div>
  )
}

function PaidBanner({ result, onClose }: { result: SwipeResult; onClose: () => void }) {
  const { bill, billionaire } = result
  return (
    <div className="paid-banner" role="status">
      <div className="paid-banner__top">
        <strong className="paid-banner__title">💸 Paid!</strong>
        <button type="button" className="paid-banner__close" onClick={onClose} aria-label="Dismiss">
          ✕
        </button>
      </div>
      <p className="paid-banner__text">
        You covered {bill.submitterName}’s “{bill.title}”: <strong>{formatCents(bill.amountCents)}</strong>.
      </p>
      <dl className="paid-banner__stats">
        <div>
          <dt>Earned back</dt>
          <dd>{formatDuration(earnBackSeconds(bill.amountCents, billionaire.netWorthCents))}</dd>
        </div>
        <div>
          <dt>Of fortune</dt>
          <dd>{formatTinyPercent(bill.amountCents / billionaire.netWorthCents)}</dd>
        </div>
        <div>
          <dt>Feels like</dt>
          <dd>{householdEquivalent(bill.amountCents, billionaire.netWorthCents)}</dd>
        </div>
      </dl>
    </div>
  )
}

function SwipeRoom({
  token,
  me,
  onUpdate,
}: {
  token: string
  me: PublicBillionaire
  onUpdate: (me: PublicBillionaire) => void
}) {
  const [banner, setBanner] = useState<SwipeResult | null>(null)
  const [boredom, setBoredom] = useState(92)
  const { notify, celebrate } = useFeedback()

  useEffect(() => {
    const timer = window.setInterval(() => setBoredom((value) => Math.min(100, value + 1)), 4000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!banner) return
    const timer = window.setTimeout(() => setBanner(null), 4500)
    return () => window.clearTimeout(timer)
  }, [banner])

  const onResult = useCallback(
    (result: SwipeResult) => {
      onUpdate(result.billionaire)
      if (result.outcome === 'paid') {
        setBoredom((value) => Math.max(0, value - 16))
        setBanner(result)
        celebrate()
      } else if (result.outcome === 'already-paid') {
        const rival = result.bill.paidBy?.name ?? 'Another billionaire'
        notify(`Too slow! ${rival} already paid ${result.bill.submitterName}’s bill.`)
      } else {
        setBoredom((value) => Math.min(100, value + 3))
      }
    },
    [onUpdate, celebrate, notify],
  )

  return (
    <div className="vault">
      <section className="hud" aria-label="Your billionaire status">
        <div className="hud__who">
          <span className="hud__avatar" aria-hidden="true">
            {me.avatar}
          </span>
          <div>
            <strong className="hud__name">{me.name}</strong>
            <span className="hud__source">{me.wealthSource}</span>
          </div>
        </div>
        <NetWorth me={me} />
        <Boredom value={boredom} />
        <a className="hud__portfolio" href={href('/billions/portfolio')}>
          <span className="hud__label">Portfolio</span>
          <span className="hud__value">
            {me.billsPaid} paid · {formatCents(me.totalPaidCents)}
          </span>
        </a>
      </section>
      <div className="vault__deck">
        {banner && <PaidBanner key={banner.bill.id} result={banner} onClose={() => setBanner(null)} />}
        <SwipeDeck token={token} onResult={onResult} />
      </div>
    </div>
  )
}

export function Vault() {
  const [token, setToken] = useState(() => billionaireToken())
  const [me, setMe] = useState<PublicBillionaire | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    api.me(token).then(
      (billionaire) => {
        if (!cancelled) setMe(billionaire)
      },
      (failure: unknown) => {
        if (cancelled) return
        if (failure instanceof ApiRequestError && failure.status === 401) {
          saveBillionaireToken(null)
          setToken(null)
        } else {
          setError(failure instanceof Error ? failure.message : 'The vault is closed.')
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) {
    return (
      <BillionaireSetup
        onReady={(session) => {
          saveBillionaireToken(session.token)
          setMe(session.billionaire)
          setToken(session.token)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }
  if (!me) {
    return <div className="page-message">{error ?? 'Polishing the monocle…'}</div>
  }
  return <SwipeRoom token={token} me={me} onUpdate={setMe} />
}
