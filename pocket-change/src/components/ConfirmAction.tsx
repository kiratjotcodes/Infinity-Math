import { useState } from 'react'

/** A button that asks "are you sure?" on the page itself instead of through window.confirm. */
export function ConfirmAction({
  label,
  question,
  confirmLabel,
  onConfirm,
}: {
  label: string
  question: string
  confirmLabel: string
  onConfirm: () => void
}) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button type="button" className="link-button link-button--muted" onClick={() => setAsking(true)}>
        {label}
      </button>
    )
  }
  return (
    <span className="confirm" role="group" aria-label={question}>
      <span className="confirm__question">{question}</span>
      <button
        type="button"
        className="link-button confirm__yes"
        autoFocus
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="link-button link-button--muted" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  )
}
