import { describe, expect, it } from 'vitest'
import {
  addComplex,
  calculateOrbit,
  isInMainCardioidOrBulb,
  magnitudeSquared,
  mapComplexToPixel,
  mapPixelToComplex,
  nextIteration,
  renderFractal,
  squareComplex,
  type Viewport,
} from './fractal'

describe('complex-number calculations', () => {
  it('adds two complex values', () => {
    expect(addComplex({ re: 2, im: -3 }, { re: -4, im: 5 })).toEqual({ re: -2, im: 2 })
  })

  it('squares a complex value', () => {
    expect(squareComplex({ re: 2, im: 3 })).toEqual({ re: -5, im: 12 })
  })

  it('evaluates z² + c', () => {
    expect(nextIteration({ re: 1, im: 1 }, { re: -0.5, im: 0.25 })).toEqual({
      re: -0.5,
      im: 2.25,
    })
  })

  it('calculates squared magnitude without a square root', () => {
    expect(magnitudeSquared({ re: 3, im: 4 })).toBe(25)
  })
})

describe('escape and bounded-orbit detection', () => {
  it('detects a rapidly escaping Mandelbrot parameter', () => {
    const orbit = calculateOrbit({ re: 0, im: 0 }, { re: 2, im: 0 }, 100)
    expect(orbit.status).toBe('escaped')
    expect(orbit.escapeIteration).toBe(2)
  })

  it('reports a Julia seed outside the escape radius at z₀', () => {
    const orbit = calculateOrbit({ re: 3, im: 0 }, { re: 0, im: 0 }, 100)
    expect(orbit.status).toBe('escaped')
    expect(orbit.escapeIteration).toBe(0)
    expect(orbit.points).toHaveLength(1)
  })

  it('detects the bounded fixed point at c = 0', () => {
    const orbit = calculateOrbit({ re: 0, im: 0 }, { re: 0, im: 0 }, 100)
    expect(orbit.status).toBe('bounded')
    expect(orbit.escapeIteration).toBeUndefined()
  })

  it('detects the period-two cycle at c = -1', () => {
    const orbit = calculateOrbit({ re: 0, im: 0 }, { re: -1, im: 0 }, 100)
    expect(orbit.status).toBe('bounded')
    expect(orbit.points.at(-1)).toMatchObject({ re: 0, im: 0 })
  })

  it('reports the finite iteration limit when no escape or cycle is proven', () => {
    const orbit = calculateOrbit({ re: 0, im: 0 }, { re: -0.75, im: 0.1 }, 3)
    expect(orbit.status).toBe('iteration-limit')
    expect(orbit.points).toHaveLength(4)
  })

  it('recognises analytic Mandelbrot interior regions', () => {
    expect(isInMainCardioidOrBulb({ re: 0, im: 0 })).toBe(true)
    expect(isInMainCardioidOrBulb({ re: -1, im: 0 })).toBe(true)
    expect(isInMainCardioidOrBulb({ re: 1, im: 0 })).toBe(false)
  })
})

describe('canvas pixel renderer', () => {
  it('renders a complete opaque RGBA buffer at the requested resolution', () => {
    const pixels = renderFractal({
      width: 5,
      height: 3,
      maxIterations: 20,
      mode: 'mandelbrot',
      juliaC: { re: 0, im: 0 },
      viewport: { center: { re: -0.5, im: 0 }, scale: 3 },
    })

    expect(pixels).toHaveLength(5 * 3 * 4)
    for (let offset = 3; offset < pixels.length; offset += 4) {
      expect(pixels[offset]).toBe(255)
    }
  })
})

describe('viewport coordinate transforms', () => {
  const viewport: Viewport = { center: { re: -0.5, im: 0.2 }, scale: 3 }

  it('maps the canvas centre to the viewport centre', () => {
    expect(mapPixelToComplex(400, 250, 800, 500, viewport)).toEqual(viewport.center)
  })

  it('round-trips complex and pixel coordinates', () => {
    const complex = { re: -1.25, im: 0.53 }
    const pixel = mapComplexToPixel(complex, 800, 500, viewport)
    const roundTrip = mapPixelToComplex(pixel.x, pixel.y, 800, 500, viewport)
    expect(roundTrip.re).toBeCloseTo(complex.re, 12)
    expect(roundTrip.im).toBeCloseTo(complex.im, 12)
  })
})
