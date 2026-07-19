import { useState } from 'react'
import { calculateOrbit, formatComplex, type Complex } from '../lib/fractal'

export function EducationPage() {
  const [sampleC, setSampleC] = useState<Complex>({ re: -0.1, im: 0.65 })
  const sampleOrbit = calculateOrbit({ re: 0, im: 0 }, sampleC, 8)

  return (
    <main className="page-shell learn-page">
      <section className="learn-hero">
        <div className="learn-orbit-art" aria-hidden="true">
          <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" />
          <span className="orbit-node node-one" /><span className="orbit-node node-two" /><span className="orbit-node node-three" />
          <div className="formula-orb">z² + c</div>
        </div>
        <div className="learn-hero-copy">
          <p className="eyebrow">Mathematics, made visible</p>
          <h1>One tiny rule.<br /><span>Infinite structure.</span></h1>
          <p>
            Fractals are what happens when a simple equation is repeated and its history is recorded.
            Itera turns that recursion into a field you can navigate.
          </p>
        </div>
      </section>

      <section className="concept-grid">
        <article className="concept-card panel accent-violet">
          <span className="concept-index">01</span>
          <div className="concept-icon">ℂ</div>
          <h2>The complex plane</h2>
          <p>A complex number <i>z = a + bi</i> becomes a point: its real part runs horizontally and its imaginary part vertically.</p>
          <div className="mini-plane" aria-hidden="true"><i className="axis-x" /><i className="axis-y" /><span /><b>a + bi</b></div>
        </article>
        <article className="concept-card panel accent-coral">
          <span className="concept-index">02</span>
          <div className="concept-icon">↻</div>
          <h2>Iteration</h2>
          <p>Feed each result back into the same rule. The resulting sequence z₀, z₁, z₂… is called an orbit.</p>
          <div className="formula-stack"><span>z₀ = 0</span><span>z₁ = z₀² + c</span><span>z₂ = z₁² + c</span></div>
        </article>
        <article className="concept-card panel accent-mint">
          <span className="concept-index">03</span>
          <div className="concept-icon">⌁</div>
          <h2>Escape</h2>
          <p>Once |z| exceeds 2, the orbit will race toward infinity. The number of steps taken becomes the pixel’s colour.</p>
          <div className="escape-scale"><span>slow</span><i /><i /><i /><i /><i /><span>fast</span></div>
        </article>
      </section>

      <section className="equation-section panel">
        <div className="equation-copy">
          <p className="eyebrow">The engine</p>
          <h2>The escape-time algorithm</h2>
          <p>
            For every pixel, map its screen position to a complex coordinate. Repeatedly square and add,
            stopping when the magnitude crosses the escape radius or the iteration ceiling is reached.
          </p>
          <div className="equation-display">
            <span>z<sub>n+1</sub></span><b>=</b><span>z<sub>n</sub><sup>2</sup></span><b>+</b><span>c</span>
          </div>
          <div className="family-comparison">
            <div><strong>Mandelbrot</strong><span>z₀ = 0</span><span>pixel → c</span></div>
            <div><strong>Julia</strong><span>pixel → z₀</span><span>c is fixed</span></div>
          </div>
        </div>
        <div className="algorithm-card">
          <div className="code-title"><span><i /><i /><i /></span><b>escape-time.ts</b></div>
          <pre aria-label="Pseudocode for the escape-time algorithm"><code>{`for each pixel (x, y):
  c  ← mapToComplex(x, y)
  z  ← 0

  for n ← 0 to maxIterations:
    z ← z² + c

    if |z| > 2:
      color ← palette(n)
      break

  if orbit did not escape:
    color ← interior`}</code></pre>
          <div className="complexity-note"><span>TIME</span><strong>O(width × height × iterations)</strong></div>
        </div>
      </section>

      <section className="orbit-sandbox panel">
        <div className="sandbox-heading">
          <div><p className="eyebrow">Try the recurrence</p><h2>Eight steps, no hidden work</h2></div>
          <div className="sandbox-inputs">
            <label>Re(c)<input type="number" step="0.05" value={sampleC.re} onChange={(event) => setSampleC({ ...sampleC, re: Number(event.target.value) })} /></label>
            <label>Im(c)<input type="number" step="0.05" value={sampleC.im} onChange={(event) => setSampleC({ ...sampleC, im: Number(event.target.value) })} /></label>
          </div>
        </div>
        <div className="step-ribbon">
          {sampleOrbit.points.map((point, index) => (
            <div className="step-card" key={point.iteration}>
              <span>z<sub>{point.iteration}</sub></span>
              <strong>{formatComplex(point, 3)}</strong>
              {index < sampleOrbit.points.length - 1 && <i>→</i>}
            </div>
          ))}
        </div>
        <p className={`sandbox-result ${sampleOrbit.status}`}>
          <i /> Result: {sampleOrbit.status === 'escaped' ? `escaped at iteration ${sampleOrbit.escapeIteration}` : sampleOrbit.status.replace('-', ' ')}
        </p>
      </section>

      <section className="bridge-section">
        <div><p className="eyebrow">The connection</p><h2>Where mathematics meets computer science</h2></div>
        <div className="bridge-flow">
          <div><span>01</span><strong>Equation</strong><small>A recursive definition</small></div><i>→</i>
          <div><span>02</span><strong>Algorithm</strong><small>Loops and escape tests</small></div><i>→</i>
          <div><span>03</span><strong>Parallelism</strong><small>Independent pixels in a worker</small></div><i>→</i>
          <div><span>04</span><strong>Image</strong><small>Millions of computed decisions</small></div>
        </div>
      </section>
    </main>
  )
}

