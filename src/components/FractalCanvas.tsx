import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react'
import {
  mapComplexToPixel,
  mapPixelToComplex,
  renderFractal,
  type Complex,
  type FractalMode,
  type RenderConfig,
  type Viewport,
} from '../lib/fractal'

interface Props {
  mode: FractalMode
  maxIterations: number
  juliaC: Complex
  viewport: Viewport
  selectedPoint: Complex | null
  onViewportChange: (viewport: Viewport) => void
  onPointSelect: (point: Complex) => void
}

interface Size {
  cssWidth: number
  cssHeight: number
  pixelWidth: number
  pixelHeight: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  startCenter: Complex
  moved: boolean
}

const EMPTY_SIZE: Size = { cssWidth: 0, cssHeight: 0, pixelWidth: 0, pixelHeight: 0 }

export function FractalCanvas({
  mode,
  maxIterations,
  juliaC,
  viewport,
  selectedPoint,
  onViewportChange,
  onPointSelect,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const renderIdRef = useRef(0)
  const [size, setSize] = useState<Size>(EMPTY_SIZE)
  const [renderState, setRenderState] = useState<{ active: boolean; duration: number | null }>({
    active: true,
    duration: null,
  })
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    const updateSize = () => {
      const rect = shell.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65)
      const cssWidth = Math.max(1, Math.round(rect.width))
      const cssHeight = Math.max(1, Math.round(rect.height))
      const pixelWidth = Math.max(1, Math.round(cssWidth * pixelRatio))
      const pixelHeight = Math.max(1, Math.round(cssHeight * pixelRatio))
      setSize({ cssWidth, cssHeight, pixelWidth, pixelHeight })
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(shell)
    updateSize()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !size.pixelWidth || !size.pixelHeight) return

    canvas.width = size.pixelWidth
    canvas.height = size.pixelHeight
    const config: RenderConfig = {
      width: size.pixelWidth,
      height: size.pixelHeight,
      mode,
      maxIterations,
      juliaC,
      viewport,
    }
    const renderId = ++renderIdRef.current
    setRenderState((current) => ({ ...current, active: true }))

    workerRef.current?.terminate()

    const paint = (pixels: Uint8ClampedArray, duration: number) => {
      if (renderId !== renderIdRef.current) return
      const context = canvas.getContext('2d')
      if (!context) return
      // Copying narrows the backing store to ArrayBuffer for the DOM ImageData type.
      const imagePixels = new Uint8ClampedArray(pixels.length)
      imagePixels.set(pixels)
      context.putImageData(new ImageData(imagePixels, size.pixelWidth, size.pixelHeight), 0, 0)
      setRenderState({ active: false, duration })
    }

    let activeWorker: Worker | null = null
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../workers/fractal.worker.ts', import.meta.url), { type: 'module' })
      activeWorker = worker
      workerRef.current = worker
      worker.onmessage = (event: MessageEvent<{ renderId: number; duration: number; pixels: ArrayBuffer }>) => {
        if (event.data.renderId !== renderId) return
        paint(new Uint8ClampedArray(event.data.pixels), event.data.duration)
      }
      worker.onerror = () => {
        const startedAt = performance.now()
        paint(renderFractal(config), performance.now() - startedAt)
      }
      worker.postMessage({ renderId, config })
    } else {
      const timeout = window.setTimeout(() => {
        const startedAt = performance.now()
        paint(renderFractal(config), performance.now() - startedAt)
      }, 0)
      return () => window.clearTimeout(timeout)
    }

    return () => activeWorker?.terminate()
  }, [juliaC, maxIterations, mode, size.pixelHeight, size.pixelWidth, viewport])

  useEffect(() => () => workerRef.current?.terminate(), [])

  const eventPoint = useCallback(
    (clientX: number, clientY: number): Complex | null => {
      const shell = shellRef.current
      if (!shell || !size.cssWidth || !size.cssHeight) return null
      const rect = shell.getBoundingClientRect()
      return mapPixelToComplex(
        clientX - rect.left,
        clientY - rect.top,
        size.cssWidth,
        size.cssHeight,
        viewport,
      )
    },
    [size.cssHeight, size.cssWidth, viewport],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCenter: viewport.center,
      moved: false,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !size.cssWidth) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.hypot(dx, dy) > 4) drag.moved = true
    onViewportChange({
      scale: viewport.scale,
      center: {
        re: drag.startCenter.re - (dx / size.cssWidth) * viewport.scale,
        im: drag.startCenter.im - (dy / size.cssWidth) * viewport.scale,
      },
    })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (!drag.moved) {
      const point = eventPoint(event.clientX, event.clientY)
      if (point) onPointSelect(point)
    }
    dragRef.current = null
    setIsDragging(false)
  }

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const anchor = eventPoint(event.clientX, event.clientY)
    if (!anchor) return
    const factor = Math.exp(Math.max(-180, Math.min(180, event.deltaY)) * 0.0018)
    const nextScale = Math.max(0.0000001, Math.min(6, viewport.scale * factor))
    const ratio = nextScale / viewport.scale
    onViewportChange({
      scale: nextScale,
      center: {
        re: anchor.re - (anchor.re - viewport.center.re) * ratio,
        im: anchor.im - (anchor.im - viewport.center.im) * ratio,
      },
    })
  }

  const exportPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = `infinity-math-${mode}-${Date.now()}.png`
      link.click()
      URL.revokeObjectURL(href)
    }, 'image/png')
  }

  const marker = selectedPoint
    ? mapComplexToPixel(selectedPoint, size.cssWidth, size.cssHeight, viewport)
    : null
  const zoom = 3.2 / viewport.scale

  return (
    <div ref={shellRef} className={`fractal-shell ${isDragging ? 'is-dragging' : ''}`}>
      <canvas
        ref={canvasRef}
        className="fractal-canvas"
        aria-label={`${mode === 'mandelbrot' ? 'Mandelbrot' : 'Julia'} fractal. Drag to pan, scroll to zoom, and click to inspect an orbit.`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />

      <div className="canvas-topline">
        <div className="canvas-chip">
          <span className={`status-dot ${renderState.active ? 'is-active' : ''}`} />
          {renderState.active
            ? 'Computing field'
            : `${renderState.duration?.toFixed(0) ?? '—'} ms · ${size.pixelWidth}×${size.pixelHeight}`}
        </div>
        <button type="button" className="glass-button" onClick={exportPng} aria-label="Export fractal as PNG">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 17v3h14v-3" /></svg>
          Export PNG
        </button>
      </div>

      <div className="canvas-readout" aria-hidden="true">
        <span>Re {viewport.center.re.toFixed(5)}</span>
        <span>Im {viewport.center.im.toFixed(5)}</span>
        <span>{zoom < 1000 ? zoom.toFixed(1) : zoom.toExponential(1)}×</span>
      </div>

      {marker && marker.x >= 0 && marker.x <= size.cssWidth && marker.y >= 0 && marker.y <= size.cssHeight && (
        <div className="point-marker" style={{ left: marker.x, top: marker.y }} aria-hidden="true">
          <span />
        </div>
      )}

      {!selectedPoint && (
        <div className="canvas-hint">
          <span className="hint-target" />
          Click the field to trace an orbit
        </div>
      )}
    </div>
  )
}
