import { describe, expect, it } from 'vitest'
import { boxBetween } from './image'

describe('boxBetween', () => {
  it('normalises a drag in any direction', () => {
    expect(boxBetween({ x: 0.6, y: 0.4 }, { x: 0.2, y: 0.1 })).toEqual({
      x: 0.2,
      y: 0.1,
      width: 0.39999999999999997,
      height: 0.30000000000000004,
    })
  })

  it('clamps drags that leave the image', () => {
    expect(boxBetween({ x: -0.5, y: 0.5 }, { x: 1.4, y: 2 })).toEqual({
      x: 0,
      y: 0.5,
      width: 1,
      height: 0.5,
    })
  })
})
