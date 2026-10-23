import { useState } from 'react'
import type { Stats } from '../../shared/types'
import { api } from '../api'
import { usePolling } from '../lib/hooks'
import { formatCents, formatTinyPercent } from '../lib/money'
import { HouseTag, PaymentFeed } from './PaymentFeed'

export function Leaderboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  usePolling(async () => {
    try {
      setStats(await api.stats())
      setError(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The scoreboard is down.')
    }
  }, 8000)

  return (
    <div className="page">
      <header className="page__header">
        <p className="eyebrow">Updated live</p>
        <h1 className="page__title">The Generosity Index</h1>
        <p className="page__lede">Bored billionaires, ranked by how much pocket change they have parted with.</p>
      </header>
      {error && <p className="form-error">{error}</p>}
      {stats && (
        <div className="leaderboard-layout">
          <section aria-labelledby="ranking-heading">
            <h2 id="ranking-heading" className="section-title">
              Most generous
            </h2>
            {stats.leaderboard.length ? (
              <ol className="ranking">
                {stats.leaderboard.map((billionaire, index) => (
                  <li key={billionaire.id} className="ranking__row">
                    <span className="ranking__place">{index + 1}</span>
                    <span className="ranking__avatar" aria-hidden="true">
                      {billionaire.avatar}
                    </span>
                    <div className="ranking__who">
                      <strong className="ranking__name">
                        <span>{billionaire.name}</span>
                        {billionaire.house && <HouseTag />}
                      </strong>
                      <span>{billionaire.wealthSource}</span>
                    </div>
                    <div className="ranking__total">
                      <strong>{formatCents(billionaire.totalPaidCents)}</strong>
                      <span>
                        {billionaire.billsPaid} {billionaire.billsPaid === 1 ? 'bill' : 'bills'} ·{' '}
                        {formatTinyPercent(billionaire.totalPaidCents / billionaire.netWorthCents)} of
                        net worth
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-note">Nobody has been generous yet. Be the first.</p>
            )}
          </section>
          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="section-title">
              Just paid
            </h2>
            <PaymentFeed items={stats.recent} />
          </section>
        </div>
      )}
    </div>
  )
}
