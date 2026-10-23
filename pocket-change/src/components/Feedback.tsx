import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

type Tone = 'good' | 'bad' | 'info'

interface Toast {
  id: number
  tone: Tone
  text: string
}

interface Feedback {
  notify: (text: string, tone?: Tone) => void
  celebrate: () => void
}

const FeedbackContext = createContext<Feedback>({ notify: () => {}, celebrate: () => {} })

export const useFeedback = () => useContext(FeedbackContext)

const CONFETTI = ['💵', '🪙', '💸', '✨']
const COLORS = ['#1f8a5b', '#d6a21e', '#f4ead2', '#2fb979', '#b8860b']

interface Piece {
  id: number
  left: number
  delay: number
  duration: number
  spin: number
  drift: number
  glyph: string | null
  color: string
}

function makePieces(seed: number): Piece[] {
  return Array.from({ length: 46 }, (_, index) => ({
    id: seed * 100 + index,
    left: Math.random() * 100,
    delay: Math.random() * 0.35,
    duration: 1.6 + Math.random() * 1.2,
    spin: (Math.random() - 0.5) * 900,
    drift: (Math.random() - 0.5) * 160,
    glyph: index % 3 === 0 ? CONFETTI[index % CONFETTI.length] : null,
    color: COLORS[index % COLORS.length],
  }))
}

/** Toasts and confetti, available anywhere through `useFeedback()`. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [bursts, setBursts] = useState<Array<{ id: number; pieces: Piece[] }>>([])
  const nextId = useRef(1)

  const notify = useCallback((text: string, tone: Tone = 'info') => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-2), { id, tone, text }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200)
  }, [])

  const celebrate = useCallback(() => {
    const id = nextId.current++
    setBursts((current) => [...current, { id, pieces: makePieces(id) }])
    window.setTimeout(() => setBursts((current) => current.filter((burst) => burst.id !== id)), 3200)
  }, [])

  const value = useMemo(() => ({ notify, celebrate }), [notify, celebrate])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            {toast.text}
          </div>
        ))}
      </div>
      <div className="confetti" aria-hidden="true">
        {bursts.flatMap((burst) =>
          burst.pieces.map((piece) => (
            <span
              key={piece.id}
              className={piece.glyph ? 'confetti__piece confetti__piece--glyph' : 'confetti__piece'}
              style={
                {
                  left: `${piece.left}%`,
                  background: piece.glyph ? undefined : piece.color,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                  '--spin': `${piece.spin}deg`,
                  '--drift': `${piece.drift}px`,
                } as CSSProperties
              }
            >
              {piece.glyph}
            </span>
          )),
        )}
      </div>
    </FeedbackContext.Provider>
  )
}

/** Fires `celebrate` once for every bill id that flips from open to paid after the first load. */
export function useCelebratePaid(
  bills: Array<{ id: string; status: string }> | null,
  onNewlyPaid: (ids: string[]) => void,
) {
  const known = useRef<Map<string, string> | null>(null)
  const callback = useRef(onNewlyPaid)
  callback.current = onNewlyPaid
  useEffect(() => {
    if (!bills) return
    const previous = known.current
    known.current = new Map(bills.map((bill) => [bill.id, bill.status]))
    if (!previous) return
    const flipped = bills
      .filter((bill) => bill.status === 'paid' && previous.get(bill.id) === 'open')
      .map((bill) => bill.id)
    if (flipped.length) callback.current(flipped)
  }, [bills])
}
