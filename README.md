# Itera

Itera is an interactive complex-dynamics laboratory for exploring the Mandelbrot set, Julia sets, and the orbits hidden behind their pixels. It is a frontend-only React application built for a concise hackathon demonstration.

## Run locally

```bash
npm install
npm run dev
```

For verification:

```bash
npm test
npm run build
```

## Three-minute demo path

1. Start in **Explore** and zoom into a detailed Mandelbrot boundary.
2. Click a point to reveal its exact complex coordinate, escape state, complete iteration sequence, and Argand-plane orbit.
3. Switch to **Julia**, choose the Rabbit or Spiral preset, and adjust the real and imaginary parts of `c`.
4. Export the current field as a PNG.
5. Open **The mathematics** for the visual escape-time explanation, then run the six-sample suite in **Performance lab**.

## Architecture

- `src/lib/fractal.ts` — complex arithmetic, orbit classification, coordinate mapping, and escape-time pixel renderer
- `src/workers/fractal.worker.ts` — off-main-thread rendering with transferable pixel buffers
- `src/components/FractalCanvas.tsx` — responsive Canvas, zoom/pan interaction, point selection, and PNG export
- `src/components/OrbitInspector.tsx` — full iteration sequence and orbit status
- `src/components/ArgandDiagram.tsx` — visual orbit plot on the complex plane
- `src/components/PerformancePage.tsx` — local resolution/iteration benchmarks

No backend, account system, or persistence layer is required.
