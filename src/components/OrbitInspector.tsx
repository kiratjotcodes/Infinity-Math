import { formatComplex, type Complex, type FractalMode, type OrbitResult } from '../lib/fractal'
import { ArgandDiagram } from './ArgandDiagram'

interface Props {
  selectedPoint: Complex | null
  mode: FractalMode
  juliaC: Complex
  orbit: OrbitResult | null
}

const STATUS_COPY = {
  escaped: { label: 'Escaped', detail: 'Magnitude exceeded the escape radius.', className: 'escaped' },
  bounded: { label: 'Bounded cycle', detail: 'A repeating orbit was detected.', className: 'bounded' },
  'iteration-limit': { label: 'Iteration limit', detail: 'No escape or cycle was proven in this sample.', className: 'limit' },
}

export function OrbitInspector({ selectedPoint, mode, juliaC, orbit }: Props) {
  if (!selectedPoint || !orbit) {
    return (
      <section className="orbit-placeholder panel">
        <div className="target-graphic"><span /><span /></div>
        <div>
          <p className="eyebrow">Orbit inspector</p>
          <h2>Select a point in the field</h2>
          <p>Infinity Math will expose each step of zₙ₊₁ = zₙ² + c and plot its path through the complex plane.</p>
        </div>
        <div className="orbit-preview-code">
          <span>z₀</span><strong>0.000 + 0.000i</strong>
          <span>z₁</span><strong>c</strong>
          <span>z₂</span><strong>c² + c</strong>
        </div>
      </section>
    )
  }

  const status = STATUS_COPY[orbit.status]
  const inputC = mode === 'mandelbrot' ? selectedPoint : juliaC
  const z0 = mode === 'mandelbrot' ? { re: 0, im: 0 } : selectedPoint

  return (
    <section className="orbit-inspector panel">
      <header className="orbit-header">
        <div>
          <p className="eyebrow">Orbit inspector</p>
          <h2>{mode === 'mandelbrot' ? 'Parameter c' : 'Initial value z₀'} <span>{formatComplex(selectedPoint)}</span></h2>
        </div>
        <div className={`orbit-status ${status.className}`}>
          <span className="status-glyph" />
          <div><strong>{status.label}</strong><small>{status.detail}</small></div>
          {orbit.escapeIteration !== undefined && <b>n = {orbit.escapeIteration}</b>}
        </div>
      </header>

      <div className="orbit-body">
        <div className="argand-panel">
          <div className="subpanel-heading">
            <div><span className="legend-dot" /> Argand plane</div>
            <span>{orbit.points.length} computed states</span>
          </div>
          <ArgandDiagram points={orbit.points} />
          <div className="argand-legend"><span><i className="start" /> z₀</span><span><i className="path" /> orbit path</span><span><i className="end" /> final z</span></div>
        </div>

        <div className="sequence-panel">
          <div className="subpanel-heading">
            <div>Iteration sequence</div>
            <span>zₙ₊₁ = zₙ² + c</span>
          </div>
          <div className="sequence-context">
            <span>z₀ = {formatComplex(z0, 4)}</span>
            <span>c = {formatComplex(inputC, 4)}</span>
          </div>
          <div className="sequence-table" role="table" aria-label="Every calculated orbit iteration">
            <div className="sequence-row sequence-table-head" role="row">
              <span>n</span><span>Real</span><span>Imaginary</span><span>|z|</span>
            </div>
            <div className="sequence-scroll">
              {orbit.points.map((point) => (
                <div className="sequence-row" role="row" key={point.iteration}>
                  <span>{point.iteration}</span>
                  <span>{point.re.toFixed(8)}</span>
                  <span>{point.im.toFixed(8)}</span>
                  <span>{point.magnitude > 9999 ? point.magnitude.toExponential(3) : point.magnitude.toFixed(6)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
