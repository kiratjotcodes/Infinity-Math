/// <reference lib="webworker" />

import { renderFractal, type RenderConfig } from '../lib/fractal'

interface RenderRequest {
  renderId: number
  config: RenderConfig
}

self.onmessage = (event: MessageEvent<RenderRequest>) => {
  const { renderId, config } = event.data
  const startedAt = performance.now()
  const pixels = renderFractal(config)
  self.postMessage(
    {
      renderId,
      width: config.width,
      height: config.height,
      duration: performance.now() - startedAt,
      pixels: pixels.buffer,
    },
    { transfer: [pixels.buffer] },
  )
}

export {}

