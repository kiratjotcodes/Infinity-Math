import { useState } from 'react'
import { categoryInfo } from '../../shared/types'
import type { Portfolio } from '../../shared/types'
import { api, ApiRequestError } from '../api'
import { usePolling } from '../lib/hooks'
import { billionaireToken, saveBillionaireToken } from '../lib/identity'
import {
  earnBackSeconds,
  formatCents,
  formatDuration,
  formatTinyPercent,
  householdEquivalent,
} from '../lib/money'
import { href, navigate } from '../lib/router'
import { timeAgo } from '../lib/time'

export function PortfolioPage() {
  const token = billionaireToken()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [error, setError] = useState<string | null>(null)

  usePolling(async () => {
    if (!token) return
    try {
      setPortfolio(await api.portfolio(token))
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.status === 401) navigate('/billions')
      else setError(failure instanceof Error ? failure.message : 'The accountants are at lunch.')
    }
  }, 15_000)

  if (!token) {
    return (
      <div className="page page--vault page-message">
        <p>You are not a billionaire yet.</p>
        <a className="button button--gold" href={href('/billions')}>
          Become one
        </a>
      </div>
    )
  }

  function retire() {
    const sure = window.confirm(
      'Retire from billionaire life? Your name stays on the leaderboard, but this browser will forget you.',
    )
    if (!sure) return
    saveBillionaireToken(null)
    navigate('/billions')
  }

  const me = portfolio?.billionaire
  return (
    <div className="page page--vault">
      <header className="page__header">
        <a className="back-link" href={href('/billions')}>
          ← Back to swiping
        </a>
        <h1 className="page__title">
          {me ? (
            <>
              {me.avatar} {me.name}’s philanthropy
            </>
          ) : (
            'Your philanthropy'
          )}
        </h1>
        {me && <p className="page__lede">{me.wealthSource}</p>}
      </header>
      {error && <p className="form-error">{error}</p>}
      {me && portfolio && (
        <>
          <dl className="tiles">
            <div className="tile">
              <dt>Bills paid</dt>
              <dd>{me.billsPaid}</dd>
            </div>
            <div className="tile">
              <dt>Total given</dt>
              <dd>{formatCents(me.totalPaidCents)}</dd>
            </div>
            <div className="tile">
              <dt>Of your fortune</dt>
              <dd>{formatTinyPercent(me.totalPaidCents / me.netWorthCents)}</dd>
            </div>
            <div className="tile">
              <dt>Earned back in</dt>
              <dd>{formatDuration(earnBackSeconds(me.totalPaidCents, me.netWorthCents))}</dd>
            </div>
          </dl>
          <p className="portfolio__quip">
            To a typical household, everything you have given away so far feels like{' '}
            <strong>{householdEquivalent(me.totalPaidCents, me.netWorthCents)}</strong>.
          </p>

          <h2 className="section-title">Bills you made disappear</h2>
          {portfolio.bills.length ? (
            <ul className="paid-list">
              {portfolio.bills.map((bill) => (
                <li key={bill.id} className="paid-list__item">
                  <span className="paid-list__emoji" aria-hidden="true">
                    {categoryInfo(bill.category).emoji}
                  </span>
                  <div className="paid-list__body">
                    <strong>
                      {bill.submitterName}’s {bill.title}
                    </strong>
                    <span>“{bill.plea}”</span>
                  </div>
                  <div className="paid-list__amount">
                    <strong>{formatCents(bill.amountCents)}</strong>
                    {bill.paidBy && <span>{timeAgo(bill.paidBy.at)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">
              Nothing yet. <a href={href('/billions')}>Go swipe right on someone’s rent.</a>
            </p>
          )}
          <button type="button" className="link-button link-button--muted" onClick={retire}>
            Retire from billionaire life on this device
          </button>
        </>
      )}
    </div>
  )
}
