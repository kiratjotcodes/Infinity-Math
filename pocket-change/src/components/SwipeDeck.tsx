import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { PublicBill, SwipeDirection, SwipeResult } from '../../shared/types'
import { api, ApiRequestError } from '../api'
import { usePolling, usePrefersReducedMotion } from '../lib/hooks'
import { BillCard, BillLightbox } from './BillCard'
import { useFeedback } from './Feedback'

const EXIT_MS = 320
const SWIPE_DISTANCE = 110
const VISIBLE_CARDS = 3

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

interface SwipeCardProps {
  bill: PublicBill
  depth: number
  fling: SwipeDirection | null
  reducedMotion: boolean
  onSwipe: (bill: PublicBill, direction: SwipeDirection) => void
  onExpand: (bill: PublicBill) => void
}

function SwipeCard({ bill, depth, fling, reducedMotion, onSwipe, onExpand }: SwipeCardProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null)
  const gesture = useRef<{ id: number; x: number; y: number; at: number } | null>(null)
  const done = useRef(false)

  const leave = useCallback(
    (direction: SwipeDirection) => {
      if (done.current) return
      done.current = true
      setLeaving(direction)
      setDragging(false)
      window.setTimeout(() => onSwipe(bill, direction), reducedMotion ? 0 : EXIT_MS)
    },
    [bill, onSwipe, reducedMotion],
  )

  useEffect(() => {
    if (fling) leave(fling)
  }, [fling, leave])

  const top = depth === 0

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!top || done.current || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button, a')) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() }
    setDragging(true)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    setOffset({ x: event.clientX - start.x, y: event.clientY - start.y })
  }

  function finish(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    gesture.current = null
    setDragging(false)
    const dx = event.clientX - start.x
    const flicked = Math.abs(dx) > 50 && performance.now() - start.at < 250
    if (!cancelled && (Math.abs(dx) > SWIPE_DISTANCE || flicked)) leave(dx > 0 ? 'right' : 'left')
    else setOffset({ x: 0, y: 0 })
  }

  let style: CSSProperties
  if (top) {
    const x = leaving ? (leaving === 'right' ? 1 : -1) * (window.innerWidth + 240) : offset.x
    const y = leaving ? offset.y + 60 : offset.y
    const rotation = reducedMotion ? 0 : Math.max(-28, Math.min(28, x * 0.06))
    style = {
      transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
      transition: dragging || reducedMotion ? 'none' : `transform ${EXIT_MS}ms cubic-bezier(.2,.75,.3,1)`,
    }
  } else {
    style = { transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.05})` }
  }

  const paid = leaving === 'right' ? 1 : leaving ? 0 : clamp01(offset.x / SWIPE_DISTANCE)
  const passed = leaving === 'left' ? 1 : leaving ? 0 : clamp01(-offset.x / SWIPE_DISTANCE)
  const canExpand = top && bill.attachment !== null && bill.attachment.mime !== 'application/pdf'

  return (
    <div
      className={top ? 'swipe-card swipe-card--top' : 'swipe-card'}
      style={{ ...style, zIndex: VISIBLE_CARDS - depth }}
      aria-hidden={!top}
      inert={!top}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
    >
      <BillCard bill={bill} onExpand={canExpand ? () => onExpand(bill) : undefined} />
      <span className="stamp stamp--pay" style={{ opacity: paid }}>
        Paid
      </span>
      <span className="stamp stamp--pass" style={{ opacity: passed }}>
        Boring
      </span>
    </div>
  )
}

interface SwipeDeckProps {
  token: string
  onResult: (result: SwipeResult) => void
}

export function SwipeDeck({ token, onResult }: SwipeDeckProps) {
  const [cards, setCards] = useState<PublicBill[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [fling, setFling] = useState<SwipeDirection | null>(null)
  const [expanded, setExpanded] = useState<PublicBill | null>(null)
  const seen = useRef(new Set<string>())
  const loading = useRef(false)
  const cardCount = useRef(0)
  cardCount.current = cards.length
  const reducedMotion = usePrefersReducedMotion()
  const { notify } = useFeedback()

  const refill = useCallback(async () => {
    if (loading.current) return
    loading.current = true
    try {
      const fresh = await api.deck(token)
      setCards((current) => {
        const showing = new Set(current.map((bill) => bill.id))
        return [...current, ...fresh.filter((bill) => !seen.current.has(bill.id) && !showing.has(bill.id))]
      })
      setStatus('ready')
    } catch (error) {
      setStatus((current) => (current === 'loading' ? 'error' : current))
      notify(error instanceof Error ? error.message : 'Could not deal the bills.', 'bad')
    } finally {
      loading.current = false
    }
  }, [token, notify])

  // Deal on arrival, then keep checking for new bills whenever the deck runs low.
  usePolling(() => {
    if (cardCount.current < VISIBLE_CARDS) return refill()
  }, 10_000)
  useEffect(() => {
    if (status === 'ready' && cards.length < VISIBLE_CARDS) void refill()
  }, [cards.length, status, refill])

  const swipe = useCallback(
    (bill: PublicBill, direction: SwipeDirection) => {
      seen.current.add(bill.id)
      setFling(null)
      setCards((current) => current.filter((item) => item.id !== bill.id))
      api.swipe(token, bill.id, direction).then(onResult, (error: unknown) => {
        if (error instanceof ApiRequestError && error.status === 409) return
        if (error instanceof ApiRequestError && error.status === 404) {
          notify(`${bill.submitterName} withdrew that bill before you got to it.`, 'info')
          return
        }
        notify(
          error instanceof Error ? `${error.message} The bill is back on top.` : 'That swipe failed.',
          'bad',
        )
        seen.current.delete(bill.id)
        setCards((current) => [bill, ...current])
      })
    },
    [token, onResult, notify],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if ((event.target as HTMLElement | null)?.closest?.('input, textarea, select, dialog')) return
      if (!cardCount.current) return
      if (event.key === 'ArrowLeft') setFling('left')
      else if (event.key === 'ArrowRight') setFling('right')
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = cards.slice(0, VISIBLE_CARDS)

  return (
    <div className="deck">
      <div className="deck__stack">
        {status === 'loading' && <div className="deck__message">Shuffling the bills…</div>}
        {status === 'error' && (
          <div className="deck__message">
            <p>The bills are stuck in the mail.</p>
            <button type="button" className="button button--gold" onClick={() => void refill()}>
              Try again
            </button>
          </div>
        )}
        {status === 'ready' && visible.length === 0 && (
          <div className="deck__message">
            <div className="deck__yawn" aria-hidden="true">
              🥱
            </div>
            <p className="deck__empty-title">You have seen every bill.</p>
            <p>Boredom is returning. New bills arrive all the time, so this deck checks again shortly.</p>
            <button type="button" className="button button--gold" onClick={() => void refill()}>
              Check now
            </button>
          </div>
        )}
        {visible
          .map((bill, depth) => (
            <SwipeCard
              key={bill.id}
              bill={bill}
              depth={depth}
              fling={depth === 0 ? fling : null}
              reducedMotion={reducedMotion}
              onSwipe={swipe}
              onExpand={setExpanded}
            />
          ))
          .reverse()}
      </div>

      <div className="deck__controls">
        <button
          type="button"
          className="swipe-button swipe-button--pass"
          onClick={() => setFling('left')}
          disabled={!visible.length}
        >
          <span className="swipe-button__icon" aria-hidden="true">
            ✕
          </span>
          <span className="swipe-button__label">Boring</span>
        </button>
        <button
          type="button"
          className="swipe-button swipe-button--pay"
          onClick={() => setFling('right')}
          disabled={!visible.length}
        >
          <span className="swipe-button__icon" aria-hidden="true">
            💸
          </span>
          <span className="swipe-button__label">Pay it</span>
        </button>
      </div>
      <p className="deck__hint">Drag the card, tap a button, or press ← and →</p>
      <BillLightbox bill={expanded} onClose={() => setExpanded(null)} />
    </div>
  )
}
