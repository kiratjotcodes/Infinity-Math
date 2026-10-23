import { useEffect, useRef } from 'react'
import { categoryInfo } from '../../shared/types'
import type { PublicBill } from '../../shared/types'
import { uploadUrl } from '../api'
import { formatCents } from '../lib/money'
import { dueLabel, formatDate } from '../lib/time'

/** A drawn paper statement, for bills that came without a photo (or as a PDF). */
function PaperBill({ bill }: { bill: PublicBill }) {
  return (
    <div className={`paper-bill paper-bill--${bill.category}`} aria-hidden="true">
      <div className="paper-bill__sheet">
        <div className="paper-bill__head">
          <span className="paper-bill__payee">{bill.payee}</span>
          <span className="paper-bill__kind">Statement</span>
        </div>
        <div className="paper-bill__total">
          <span>Amount due</span>
          <strong>{formatCents(bill.amountCents)}</strong>
        </div>
        <div className="paper-bill__due">Please pay by {formatDate(bill.dueDate)}</div>
        <div className="paper-bill__rows">
          <span />
          <span />
          <span />
        </div>
        <div className="paper-bill__barcode" />
      </div>
    </div>
  )
}

export function BillArt({ bill, onExpand }: { bill: PublicBill; onExpand?: () => void }) {
  const attachment = bill.attachment
  if (attachment && attachment.mime !== 'application/pdf') {
    return (
      <div className="bill-art">
        <img
          className="bill-art__photo"
          src={uploadUrl(attachment)}
          alt={`Photo of ${bill.submitterName}'s ${bill.title} bill`}
          draggable={false}
        />
        {onExpand && (
          <button type="button" className="bill-art__expand" onClick={onExpand}>
            View full bill
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="bill-art">
      <PaperBill bill={bill} />
      {attachment && (
        <a
          className="bill-art__expand"
          href={uploadUrl(attachment)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open PDF
        </a>
      )}
    </div>
  )
}

export function BillCard({ bill, onExpand }: { bill: PublicBill; onExpand?: () => void }) {
  const category = categoryInfo(bill.category)
  const due = dueLabel(bill.dueDate)
  return (
    <article className="bill-card" aria-label={`${bill.submitterName} needs ${formatCents(bill.amountCents)} for ${bill.title}`}>
      <div className="bill-card__art">
        <BillArt bill={bill} onExpand={onExpand} />
        <div className="bill-card__headline">
          <span className="chip chip--glass">
            {category.emoji} {category.label}
          </span>
          <div className="bill-card__amount">{formatCents(bill.amountCents)}</div>
          <div className="bill-card__who">
            {bill.submitterName} needs this paid
            {bill.sample && <span className="tag">Sample</span>}
          </div>
        </div>
      </div>
      <div className="bill-card__body">
        <h3 className="bill-card__title">{bill.title}</h3>
        <p className="bill-card__payee">to {bill.payee}</p>
        <blockquote className="bill-card__plea">“{bill.plea}”</blockquote>
        <div className="bill-card__meta">
          <span className={due.urgent ? 'due due--urgent' : 'due'}>⏰ {due.text}</span>
          {bill.passCount > 0 && (
            <span>
              🥱 {bill.passCount} {bill.passCount === 1 ? 'billionaire' : 'billionaires'} yawned
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

/** Full-size view of an uploaded bill photo. */
export function BillLightbox({ bill, onClose }: { bill: PublicBill | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (bill && !element.open) element.showModal?.()
    if (!bill && element.open) element.close?.()
  }, [bill])

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {bill?.attachment && (
        <figure className="lightbox__figure">
          <img src={uploadUrl(bill.attachment)} alt={`${bill.submitterName}'s ${bill.title} bill`} />
          <figcaption>
            {bill.title} · {formatCents(bill.amountCents)} to {bill.payee}
          </figcaption>
        </figure>
      )}
      <button type="button" className="lightbox__close" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </dialog>
  )
}
