import { useEffect, useRef } from 'react'
import type { OrbitPoint } from '../lib/fractal'

interface Props {
  points: OrbitPoint[]
}

export function ArgandDiagram({ points }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(rect.width * ratio)
    canvas.height = Math.round(rect.height * ratio)
    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(ratio, ratio)

    const width = rect.width
    const height = rect.height
    const boundedPoints = points.filter((point) => Number.isFinite(point.re) && Number.isFinite(point.im))
    const maxValue = boundedPoints.reduce(
      (maximum, point) => Math.max(maximum, Math.abs(point.re), Math.abs(point.im)),
      2.1,
    )
    const domain = Math.min(16, Math.ceil(maxValue * 1.12 * 2) / 2)
    const plotScale = (Math.min(width, height) * 0.42) / domain
    const toX = (re: number) => width / 2 + re * plotScale
    const toY = (im: number) => height / 2 - im * plotScale

    context.clearRect(0, 0, width, height)
    const backdrop = context.createRadialGradient(width / 2, height / 2, 5, width / 2, height / 2, width * 0.6)
    backdrop.addColorStop(0, 'rgba(107, 92, 255, 0.075)')
    backdrop.addColorStop(1, 'rgba(5, 8, 17, 0)')
    context.fillStyle = backdrop
    context.fillRect(0, 0, width, height)

    context.lineWidth = 1
    context.strokeStyle = 'rgba(151, 164, 203, 0.09)'
    for (let value = -Math.floor(domain); value <= Math.floor(domain); value += 1) {
      if (value === 0) continue
      context.beginPath()
      context.moveTo(toX(value), 0)
      context.lineTo(toX(value), height)
      context.stroke()
      context.beginPath()
      context.moveTo(0, toY(value))
      context.lineTo(width, toY(value))
      context.stroke()
    }

    context.strokeStyle = 'rgba(185, 196, 226, 0.38)'
    context.beginPath()
    context.moveTo(0, height / 2)
    context.lineTo(width, height / 2)
    context.moveTo(width / 2, 0)
    context.lineTo(width / 2, height)
    context.stroke()

    context.fillStyle = 'rgba(171, 182, 213, 0.72)'
    context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.fillText('Re', width - 23, height / 2 - 8)
    context.fillText('Im', width / 2 + 8, 14)
    context.fillText(domain.toString(), toX(domain) - 15, height / 2 + 17)
    context.fillText(domain.toString(), width / 2 + 7, toY(domain) + 12)

    if (boundedPoints.length > 1) {
      const line = context.createLinearGradient(0, 0, width, height)
      line.addColorStop(0, '#6e7cff')
      line.addColorStop(0.55, '#b45cff')
      line.addColorStop(1, '#ff8b8b')
      context.strokeStyle = line
      context.lineWidth = 1.5
      context.beginPath()
      boundedPoints.forEach((point, index) => {
        const x = toX(point.re)
        const y = toY(point.im)
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.stroke()
    }

    boundedPoints.slice(0, 240).forEach((point, index) => {
      const x = toX(point.re)
      const y = toY(point.im)
      if (x < -10 || x > width + 10 || y < -10 || y > height + 10) return
      context.beginPath()
      context.arc(x, y, index === boundedPoints.length - 1 ? 4 : index === 0 ? 3.5 : 2.2, 0, Math.PI * 2)
      context.fillStyle = index === 0 ? '#75e5d3' : index === boundedPoints.length - 1 ? '#ffb26b' : '#b58aff'
      context.fill()
      if (index === 0 || index === boundedPoints.length - 1) {
        context.strokeStyle = 'rgba(255,255,255,.55)'
        context.lineWidth = 1
        context.stroke()
      }
    })
  }, [points])

  return <canvas ref={canvasRef} className="argand-canvas" aria-label="Argand diagram showing the selected point's orbit" />
}

