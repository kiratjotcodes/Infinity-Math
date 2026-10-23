import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { boxBetween } from '../lib/image'
import type { Box } from '../lib/image'

const asPercent = (box: Box) => ({
  left: `${box.x * 100}%`,
  top: `${box.y * 100}%`,
  width: `${box.width * 100}%`,
  height: `${box.height * 100}%`,
})

/** Lets people black out account numbers and addresses before a bill leaves their device. */
export function Redactor({
  src,
  boxes,
  onChange,
}: {
  src: string
  boxes: Box[]
  onChange: (boxes: Box[]) => void
}) {
  const surface = useRef<HTMLDivElement>(null)
  const origin = useRef<{ id: number; x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<Box | null>(null)

  function point(event: PointerEvent) {
    const rect = surface.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    origin.current = { id: event.pointerId, ...point(event) }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (origin.current?.id !== event.pointerId) return
    setDraft(boxBetween(origin.current, point(event)))
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (origin.current?.id !== event.pointerId) return
    const box = boxBetween(origin.current, point(event))
    origin.current = null
    setDraft(null)
    if (box.width > 0.01 && box.height > 0.01) onChange([...boxes, box])
  }

  return (
    <div className="redactor">
      <div
        ref={surface}
        className="redactor__surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          origin.current = null
          setDraft(null)
        }}
      >
        <img src={src} alt="Preview of your bill" draggable={false} />
        {boxes.map((box, index) => (
          <div key={`${box.x}-${box.y}-${index}`} className="redactor__box" style={asPercent(box)}>
            <button
              type="button"
              className="redactor__remove"
              aria-label="Remove this redaction"
              onClick={() => onChange(boxes.filter((_, other) => other !== index))}
            >
              ✕
            </button>
          </div>
        ))}
        {draft && <div className="redactor__box redactor__box--draft" style={asPercent(draft)} />}
      </div>
      <div className="redactor__tools">
        <p>
          <strong>Drag across anything private</strong>: account numbers, your address, barcodes.
          The black boxes are burned into the image before it uploads.
        </p>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => onChange(boxes.slice(0, -1))}
          disabled={!boxes.length}
        >
          Undo
        </button>
      </div>
    </div>
  )
}
