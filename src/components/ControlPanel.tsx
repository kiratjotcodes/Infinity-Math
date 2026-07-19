import type { Complex, FractalMode, Viewport } from '../lib/fractal'

interface Props {
  mode: FractalMode
  maxIterations: number
  juliaC: Complex
  viewport: Viewport
  onModeChange: (mode: FractalMode) => void
  onIterationsChange: (iterations: number) => void
  onJuliaChange: (value: Complex) => void
  onResetView: () => void
}

const JULIA_PRESETS: Array<{ name: string; value: Complex }> = [
  { name: 'Dendrite', value: { re: 0, im: 1 } },
  { name: 'Rabbit', value: { re: -0.123, im: 0.745 } },
  { name: 'Spiral', value: { re: -0.8, im: 0.156 } },
  { name: 'Siegel', value: { re: -0.391, im: -0.587 } },
]

export function ControlPanel({
  mode,
  maxIterations,
  juliaC,
  viewport,
  onModeChange,
  onIterationsChange,
  onJuliaChange,
  onResetView,
}: Props) {
  return (
    <aside className="control-panel panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Parameter space</p>
          <h2>Field controls</h2>
        </div>
        <button type="button" className="icon-button" onClick={onResetView} title="Reset view" aria-label="Reset view">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6M5.5 9A8 8 0 1 1 4 14" /></svg>
        </button>
      </div>

      <div className="control-group">
        <label className="control-label">Fractal family</label>
        <div className="segmented-control" role="group" aria-label="Fractal family">
          <button className={mode === 'mandelbrot' ? 'active' : ''} onClick={() => onModeChange('mandelbrot')}>
            Mandelbrot
          </button>
          <button className={mode === 'julia' ? 'active' : ''} onClick={() => onModeChange('julia')}>
            Julia
          </button>
        </div>
        <p className="control-help">
          {mode === 'mandelbrot'
            ? 'Each pixel is c; every orbit begins at z₀ = 0.'
            : 'Each pixel is z₀; the parameter c is fixed below.'}
        </p>
      </div>

      <div className="hairline" />

      <div className="control-group">
        <div className="label-row">
          <label htmlFor="iterations" className="control-label">Iteration ceiling</label>
          <output className="value-pill" htmlFor="iterations">{maxIterations}</output>
        </div>
        <input
          id="iterations"
          type="range"
          min="50"
          max="1000"
          step="25"
          value={maxIterations}
          onChange={(event) => onIterationsChange(Number(event.target.value))}
          style={{ '--range-progress': `${((maxIterations - 50) / 950) * 100}%` } as React.CSSProperties}
        />
        <div className="range-limits"><span>50</span><span>1,000</span></div>
      </div>

      {mode === 'julia' && (
        <>
          <div className="hairline" />
          <div className="control-group julia-controls">
            <div className="label-row">
              <label className="control-label">Julia parameter c</label>
              <span className="formula-mini">a + bi</span>
            </div>
            <div className="number-grid">
              <label>
                <span>Real a</span>
                <input
                  type="number"
                  min="-2"
                  max="2"
                  step="0.001"
                  value={juliaC.re}
                  onChange={(event) => onJuliaChange({ ...juliaC, re: Number(event.target.value) })}
                />
              </label>
              <label>
                <span>Imaginary b</span>
                <input
                  type="number"
                  min="-2"
                  max="2"
                  step="0.001"
                  value={juliaC.im}
                  onChange={(event) => onJuliaChange({ ...juliaC, im: Number(event.target.value) })}
                />
              </label>
            </div>
            <div className="preset-grid">
              {JULIA_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  className={juliaC.re === preset.value.re && juliaC.im === preset.value.im ? 'active' : ''}
                  onClick={() => onJuliaChange(preset.value)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="panel-spacer" />
      <div className="view-summary">
        <div>
          <span>Centre</span>
          <strong>{viewport.center.re.toFixed(3)} {viewport.center.im < 0 ? '−' : '+'} {Math.abs(viewport.center.im).toFixed(3)}i</strong>
        </div>
        <div>
          <span>Plane width</span>
          <strong>{viewport.scale < 0.001 ? viewport.scale.toExponential(2) : viewport.scale.toFixed(4)}</strong>
        </div>
      </div>
      <div className="interaction-key">
        <span><i className="mouse-icon">↕</i> Scroll to zoom</span>
        <span><i className="mouse-icon">✣</i> Drag to pan</span>
      </div>
    </aside>
  )
}

