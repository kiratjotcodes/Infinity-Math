import { categoryInfo } from '../../shared/types'
import type { RecentPayment } from '../../shared/types'
import { useNow } from '../lib/hooks'
import { formatCents } from '../lib/money'
import { timeAgo } from '../lib/time'

export function HouseTag() {
  return (
    <span className="tag tag--house" title="A simulated billionaire who keeps the demo lively">
      House
    </span>
  )
}

export function PaymentFeed({ items }: { items: RecentPayment[] }) {
  const now = useNow(15_000)
  if (!items.length) {
    return <p className="empty-note">Nobody has paid anything yet. The billionaires are napping.</p>
  }
  return (
    <ul className="feed">
      {items.map((item) => (
        <li key={item.billId} className="feed__item">
          <span className="feed__avatar" aria-hidden="true">
            {item.billionaire.avatar}
          </span>
          <p className="feed__text">
            <strong>{item.billionaire.name}</strong>
            {item.billionaire.house && <HouseTag />} paid {item.submitterName}’s{' '}
            {categoryInfo(item.category).emoji} {item.title}
          </p>
          <span className="feed__amount">{formatCents(item.amountCents)}</span>
          <span className="feed__time">{timeAgo(item.billionaire.at, now)}</span>
        </li>
      ))}
    </ul>
  )
}
