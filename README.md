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

## Use of Codex and GPT-5.6

I used OpenAI Codex with GPT-5.6 as a development collaborator throughout the project. It helped me turn the initial hackathon idea into a structured React application, reason through the complex-dynamics model, and iteratively improve the user experience.

Codex and GPT-5.6 were used to:

- design the application architecture around React, TypeScript, HTML Canvas, and Web Workers;
- implement and review the complex-number operations, escape-time renderer, orbit tracing, and coordinate transforms;
- create automated tests for complex arithmetic, escape detection, bounded cycles, viewport transforms, and rendered pixel buffers;
- refine the scientific interface, responsive layout, educational content, performance lab, and project documentation;
- visually test the application at desktop and mobile sizes, including resolving a mobile navigation layout issue.

The final project remains a frontend-only application: all fractal calculations run locally in the browser, and no user data is sent to a backend.
