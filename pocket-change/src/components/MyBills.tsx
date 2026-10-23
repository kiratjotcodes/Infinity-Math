import { useCallback, useState } from 'react'
import { categoryInfo } from '../../shared/types'
import type { PublicBill } from '../../shared/types'
import { api, uploadUrl } from '../api'
import { useNow, usePolling } from '../lib/hooks'
import { submitterToken } from '../lib/identity'
import { formatCents } from '../lib/money'
import { href } from '../lib/router'
import { dueLabel, timeAgo } from '../lib/time'
import { useCelebratePaid, useFeedback } from './Feedback'
import { HouseTag } from './PaymentFeed'

function Thumbnail({ bill }: { bill: PublicBill }) {
  const attachment = bill.attachment
  if (attachment && attachment.mime !== 'application/pdf') {
    return <img className="bill-row__thumb" src={uploadUrl(attachment)} alt="" />
  }
  return (
    <span className={`bill-row__thumb bill-row__thumb--${bill.category}`} aria-hidden="true">
      {categoryInfo(bill.category).emoji}
    </span>
  )
}

function BillRow({
  bill,
  fresh,
  now,
  onWithdraw,
}: {
  bill: PublicBill
  fresh: boolean
  now: number
  onWithdraw: (bill: PublicBill) => void
}) {
  const due = dueLabel(bill.dueDate)
  const classes = ['bill-row', `bill-row--${bill.status}`, fresh ? 'bill-row--fresh' : '']
  return (
    <li className={classes.join(' ')}>
      <Thumbnail bill={bill} />
      <div className="bill-row__body">
        <div className="bill-row__top">
          <strong className="bill-row__title">{bill.title}</strong>
          <strong className="bill-row__amount">{formatCents(bill.amountCents)}</strong>
        </div>
        <span className="bill-row__meta">
          {bill.payee} · <span className={due.urgent && bill.status === 'open' ? 'due--urgent' : ''}>{due.text}</span>
        </span>
        {bill.status === 'paid' && bill.paidBy ? (
          <span className="status status--paid">
            ✓ Paid by {bill.paidBy.avatar} <strong>{bill.paidBy.name}</strong>
            {bill.paidBy.house && <HouseTag />} · {timeAgo(bill.paidBy.at, now)}
          </span>
        ) : (
          <div className="bill-row__open">
            <span className="status status--open">
              <span className="pulse" aria-hidden="true" /> In the deck
              {bill.passCount > 0 &&
                ` · ${bill.passCount} ${bill.passCount === 1 ? 'billionaire' : 'billionaires'} yawned`}
            </span>
            <button type="button" className="link-button link-button--muted" onClick={() => onWithdraw(bill)}>
              Withdraw
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

export function MyBills({ highlight }: { highlight: string | null }) {
  const [bills, setBills] = useState<PublicBill[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { notify, celebrate } = useFeedback()
  const now = useNow(15_000)

  const load = useCallback(async () => {
    try {
      setBills(await api.myBills(submitterToken()))
      setError(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not load your bills.')
    }
  }, [])
  usePolling(load, 5000)

  useCelebratePaid(bills, (ids) => {
    celebrate()
    for (const bill of bills ?? []) {
      if (ids.includes(bill.id)) {
        notify(`🎉 ${bill.paidBy?.name ?? 'A billionaire'} just paid your ${bill.title} bill!`, 'good')
      }
    }
  })

  async function withdraw(bill: PublicBill) {
    if (!window.confirm(`Withdraw “${bill.title}” from the deck?`)) return
    try {
      await api.withdrawBill(submitterToken(), bill.id)
      notify('Bill withdrawn. The billionaires will never know.')
      await load()
    } catch (failure) {
      notify(failure instanceof Error ? failure.message : 'Could not withdraw that bill.', 'bad')
    }
  }

  const open = bills?.filter((bill) => bill.status === 'open') ?? []
  const paid = bills?.filter((bill) => bill.status === 'paid') ?? []
  const paidTotal = paid.reduce((sum, bill) => sum + bill.amountCents, 0)
  const justAdded = highlight ? bills?.find((bill) => bill.id === highlight) : undefined

  return (
    <div className="page page--narrow">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">My bills</h1>
          {paid.length > 0 && (
            <p className="page__lede">
              Billionaires have covered <strong>{formatCents(paidTotal)}</strong> for you so far.
            </p>
          )}
        </div>
        <a className="button button--money" href={href('/bills/new')}>
          + Upload a bill
        </a>
      </header>

      {justAdded?.status === 'open' && (
        <div className="notice">
          <strong>Your bill is in the deck.</strong> Billionaires are notoriously bored, so this
          should not take long. Keep this page open to watch it happen.
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      {bills === null && !error && <p className="empty-note">Finding your paperwork…</p>}

      {bills?.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__art" aria-hidden="true">
            🧾
          </div>
          <h2>No bills yet</h2>
          <p>Lucky you. Or, more likely, you have not uploaded one.</p>
          <a className="button button--money" href={href('/bills/new')}>
            Upload your first bill
          </a>
        </div>
      )}

      {open.length > 0 && (
        <section aria-labelledby="open-heading">
          <h2 id="open-heading" className="section-title">
            Waiting for a benefactor
          </h2>
          <ul className="bill-list">
            {open.map((bill) => (
              <BillRow key={bill.id} bill={bill} fresh={bill.id === highlight} now={now} onWithdraw={withdraw} />
            ))}
          </ul>
        </section>
      )}
      {paid.length > 0 && (
        <section aria-labelledby="paid-heading">
          <h2 id="paid-heading" className="section-title">
            Paid 🎉
          </h2>
          <ul className="bill-list">
            {paid.map((bill) => (
              <BillRow key={bill.id} bill={bill} fresh={false} now={now} onWithdraw={withdraw} />
            ))}
          </ul>
        </section>
      )}
      {bills && bills.length > 0 && (
        <p className="fineprint">Your bills are tied to this browser. No account needed.</p>
      )}
    </div>
  )
}
