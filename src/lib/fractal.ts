export type FractalMode = 'mandelbrot' | 'julia'

export interface Complex {
  re: number
  im: number
}

export interface Viewport {
  center: Complex
  /** Width of the visible complex plane. */
  scale: number
}

export interface RenderConfig {
  width: number
  height: number
  maxIterations: number
  mode: FractalMode
  viewport: Viewport
  juliaC: Complex
}

export interface OrbitPoint extends Complex {
  iteration: number
  magnitude: number
}

export type OrbitStatus = 'escaped' | 'bounded' | 'iteration-limit'

export interface OrbitResult {
  points: OrbitPoint[]
  status: OrbitStatus
  escapeIteration?: number
}

export const DEFAULT_MANDELBROT_VIEW: Viewport = {
  center: { re: -0.55, im: 0 },
  scale: 3.2,
}

export const DEFAULT_JULIA_VIEW: Viewport = {
  center: { re: 0, im: 0 },
  scale: 3.2,
}

export const addComplex = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
})

export const squareComplex = (z: Complex): Complex => ({
  re: z.re * z.re - z.im * z.im,
  im: 2 * z.re * z.im,
})

export const magnitudeSquared = (z: Complex): number => z.re * z.re + z.im * z.im

export const nextIteration = (z: Complex, c: Complex): Complex => addComplex(squareComplex(z), c)

export function isInMainCardioidOrBulb(c: Complex): boolean {
  const x = c.re
  const y2 = c.im * c.im
  const q = (x - 0.25) * (x - 0.25) + y2
  const inCardioid = q * (q + (x - 0.25)) <= 0.25 * y2
  const inPeriodTwoBulb = (x + 1) * (x + 1) + y2 <= 0.0625
  return inCardioid || inPeriodTwoBulb
}

/**
 * Calculates an orbit and retains each z value, including z₀. A repeated value
 * is treated as a detected bounded cycle; otherwise a non-escaping orbit is
 * reported as reaching the configured iteration limit.
 */
export function calculateOrbit(
  z0: Complex,
  c: Complex,
  maxIterations: number,
  escapeRadius = 2,
): OrbitResult {
  const points: OrbitPoint[] = [
    { iteration: 0, re: z0.re, im: z0.im, magnitude: Math.sqrt(magnitudeSquared(z0)) },
  ]
  let z = { ...z0 }
  const escapeRadiusSquared = escapeRadius * escapeRadius
  const periodicityEpsilonSquared = 1e-20

  if (magnitudeSquared(z) > escapeRadiusSquared) {
    return { points, status: 'escaped', escapeIteration: 0 }
  }

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    z = nextIteration(z, c)
    const magnitudeSq = magnitudeSquared(z)
    points.push({ iteration, re: z.re, im: z.im, magnitude: Math.sqrt(magnitudeSq) })

    if (magnitudeSq > escapeRadiusSquared) {
      return { points, status: 'escaped', escapeIteration: iteration }
    }

    // Search recent history for a repeated value. This catches fixed points and
    // short cycles without mislabelling all finite non-escaping samples.
    const searchStart = Math.max(0, points.length - 65)
    for (let index = searchStart; index < points.length - 1; index += 1) {
      const previous = points[index]
      const dRe = z.re - previous.re
      const dIm = z.im - previous.im
      if (dRe * dRe + dIm * dIm < periodicityEpsilonSquared) {
        return { points, status: 'bounded' }
      }
    }
  }

  return { points, status: 'iteration-limit' }
}

export function mapPixelToComplex(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: Viewport,
): Complex {
  const aspect = height / width
  return {
    re: viewport.center.re + (x / width - 0.5) * viewport.scale,
    im: viewport.center.im + (y / height - 0.5) * viewport.scale * aspect,
  }
}

export function mapComplexToPixel(
  point: Complex,
  width: number,
  height: number,
  viewport: Viewport,
): { x: number; y: number } {
  const aspect = height / width
  return {
    x: ((point.re - viewport.center.re) / viewport.scale + 0.5) * width,
    y: ((point.im - viewport.center.im) / (viewport.scale * aspect) + 0.5) * height,
  }
}

function smoothEscapeIteration(
  pointRe: number,
  pointIm: number,
  mode: FractalMode,
  juliaC: Complex,
  maxIterations: number,
): number {
  let zRe = mode === 'mandelbrot' ? 0 : pointRe
  let zIm = mode === 'mandelbrot' ? 0 : pointIm
  const cRe = mode === 'mandelbrot' ? pointRe : juliaC.re
  const cIm = mode === 'mandelbrot' ? pointIm : juliaC.im

  if (mode === 'julia' && zRe * zRe + zIm * zIm > 4) return 0

  if (mode === 'mandelbrot' && isInMainCardioidOrBulb({ re: cRe, im: cIm })) {
    return -1
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const nextRe = zRe * zRe - zIm * zIm + cRe
    zIm = 2 * zRe * zIm + cIm
    zRe = nextRe
    const magnitudeSq = zRe * zRe + zIm * zIm

    if (magnitudeSq > 4) {
      // Continuous coloring removes visible bands between integer iterations.
      return iteration + 1 - Math.log2(Math.log2(Math.sqrt(magnitudeSq)))
    }
  }

  return -1
}

function palette(iteration: number, maxIterations: number): [number, number, number, number] {
  if (iteration < 0) return [4, 7, 15, 255]

  const t = Math.max(0, iteration) / Math.max(1, maxIterations)
  const phase = Math.pow(Math.min(1, t * 5.2), 0.48)

  // Deep indigo → electric violet → warm coral → pale gold.
  const stops = [
    [12, 18, 42],
    [48, 54, 142],
    [130, 75, 255],
    [244, 92, 142],
    [255, 178, 91],
    [255, 239, 190],
  ]
  const scaled = phase * (stops.length - 1)
  const index = Math.min(stops.length - 2, Math.floor(scaled))
  const local = scaled - index
  const from = stops[index]
  const to = stops[index + 1]

  return [
    Math.round(from[0] + (to[0] - from[0]) * local),
    Math.round(from[1] + (to[1] - from[1]) * local),
    Math.round(from[2] + (to[2] - from[2]) * local),
    255,
  ]
}

export function renderFractal(config: RenderConfig): Uint8ClampedArray {
  const { width, height, viewport, mode, juliaC, maxIterations } = config
  const pixels = new Uint8ClampedArray(width * height * 4)
  const aspect = height / width
  const minRe = viewport.center.re - viewport.scale / 2
  const minIm = viewport.center.im - (viewport.scale * aspect) / 2
  const stepRe = viewport.scale / width
  const stepIm = (viewport.scale * aspect) / height

  for (let y = 0; y < height; y += 1) {
    const im = minIm + y * stepIm
    for (let x = 0; x < width; x += 1) {
      const re = minRe + x * stepRe
      const iteration = smoothEscapeIteration(re, im, mode, juliaC, maxIterations)
      const [red, green, blue, alpha] = palette(iteration, maxIterations)
      const offset = (y * width + x) * 4
      pixels[offset] = red
      pixels[offset + 1] = green
      pixels[offset + 2] = blue
      pixels[offset + 3] = alpha
    }
  }

  return pixels
}

export function formatComplex(value: Complex, digits = 7): string {
  const sign = value.im < 0 ? '−' : '+'
  return `${value.re.toFixed(digits)} ${sign} ${Math.abs(value.im).toFixed(digits)}i`
}
