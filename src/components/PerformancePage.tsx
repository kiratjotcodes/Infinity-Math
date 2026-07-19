import { useMemo, useRef, useState } from 'react'
import { DEFAULT_MANDELBROT_VIEW, renderFractal, type RenderConfig } from '../lib/fractal'

interface BenchmarkCase {
  width: number
  height: number
  iterations: number
}

interface BenchmarkResult extends BenchmarkCase {
  duration: number
  megapixelsPerSecond: number
}

const BENCHMARKS: BenchmarkCase[] = [
  { width: 320, height: 180, iterations: 100 },
  { width: 320, height: 180, iterations: 400 },
  { width: 640, height: 360, iterations: 100 },
  { width: 640, height: 360, iterations: 400 },
  { width: 960, height: 540, iterations: 100 },
  { width: 960, height: 540, iterations: 400 },
]

const waitForFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

export function PerformancePage() {
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [progress, setProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const cancelledRef = useRef(false)

  const runBenchmarks = async () => {
    cancelledRef.current = false
    setIsRunning(true)
    setResults([])
    setProgress(0)

    const nextResults: BenchmarkResult[] = []
    for (let index = 0; index < BENCHMARKS.length; index += 1) {
      if (cancelledRef.current) break
      await waitForFrame()
      const benchmark = BENCHMARKS[index]
      const config: RenderConfig = {
        ...benchmark,
        maxIterations: benchmark.iterations,
        mode: 'mandelbrot',
        juliaC: { re: -0.8, im: 0.156 },
        viewport: DEFAULT_MANDELBROT_VIEW,
      }
      const startedAt = performance.now()
      renderFractal(config)
      const duration = performance.now() - startedAt
      const megapixels = (benchmark.width * benchmark.height) / 1_000_000
      nextResults.push({ ...benchmark, duration, megapixelsPerSecond: megapixels / (duration / 1000) })
      setResults([...nextResults])
      setProgress(index + 1)
    }
    setIsRunning(false)
  }

  const maximumDuration = useMemo(
    () => Math.max(...results.map((result) => result.duration), 1),
    [results],
  )
  const fastest = results.length ? results.reduce((a, b) => a.duration < b.duration ? a : b) : null
  const slowest = results.length ? results.reduce((a, b) => a.duration > b.duration ? a : b) : null

  return (
    <main className="page-shell performance-page">
      <section className="performance-hero">
        <div>
          <p className="eyebrow">Performance laboratory</p>
          <h1>Measure the cost<br /><span>of more detail.</span></h1>
          <p>Benchmark the same escape-time engine across six resolution and iteration combinations on this device.</p>
        </div>
        <div className="benchmark-action panel">
          <div className="chip-row"><span>CPU</span><span>Main thread</span><span>6 samples</span></div>
          <button type="button" className="primary-button" onClick={runBenchmarks} disabled={isRunning}>
            {isRunning ? <><i className="spinner" /> Running sample {progress + 1} of {BENCHMARKS.length}</> : <><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z" /></svg> Run benchmark</>}
          </button>
          {isRunning && <button className="text-button" onClick={() => { cancelledRef.current = true }}>Stop after this sample</button>}
          <small>Runs locally. No data leaves your browser.</small>
        </div>
      </section>

      <section className="benchmark-explainer panel">
        <div><span className="metric-icon violet">▦</span><p>More pixels</p><strong>Resolution multiplies independent orbit calculations.</strong></div>
        <div className="math-operator">×</div>
        <div><span className="metric-icon coral">↻</span><p>More iterations</p><strong>Boundary points require deeper recurrence.</strong></div>
        <div className="math-operator">=</div>
        <div><span className="metric-icon mint">◷</span><p>More time</p><strong>Worst case grows with width × height × limit.</strong></div>
      </section>

      <section className="results-section">
        <div className="results-heading">
          <div><p className="eyebrow">Results</p><h2>Render-time comparison</h2></div>
          {results.length > 0 && <span className="run-complete"><i /> {results.length === BENCHMARKS.length ? 'Run complete' : `${results.length} samples recorded`}</span>}
        </div>

        {results.length === 0 ? (
          <div className="empty-results panel">
            <div className="bars-placeholder" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            <h3>Your device is the laboratory</h3>
            <p>Run the suite to populate a reproducible side-by-side comparison.</p>
          </div>
        ) : (
          <div className="results-layout">
            <div className="chart-panel panel">
              <div className="chart-grid" aria-label="Bar chart of benchmark durations">
                {results.map((result) => (
                  <div className="benchmark-bar-group" key={`${result.width}-${result.iterations}`}>
                    <div className="bar-value">{result.duration.toFixed(1)}<small>ms</small></div>
                    <div
                      className={`benchmark-bar iterations-${result.iterations}`}
                      style={{ height: `${Math.max(5, (result.duration / maximumDuration) * 100)}%` }}
                    />
                    <strong>{result.width}×{result.height}</strong>
                    <span>{result.iterations} iter.</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend"><span><i className="iter-100" /> 100 iterations</span><span><i className="iter-400" /> 400 iterations</span></div>
            </div>

            <div className="result-stats">
              <article className="stat-card panel"><span>FASTEST SAMPLE</span><strong>{fastest?.duration.toFixed(1)} ms</strong><small>{fastest?.width}×{fastest?.height} · {fastest?.iterations} iterations</small></article>
              <article className="stat-card panel"><span>HEAVIEST SAMPLE</span><strong>{slowest?.duration.toFixed(1)} ms</strong><small>{slowest?.width}×{slowest?.height} · {slowest?.iterations} iterations</small></article>
              <article className="stat-card panel"><span>PEAK THROUGHPUT</span><strong>{Math.max(...results.map((result) => result.megapixelsPerSecond)).toFixed(2)} MP/s</strong><small>Escape-time calculations on this device</small></article>
            </div>
          </div>
        )}
      </section>

      {results.length > 0 && (
        <section className="raw-results panel">
          <div className="subpanel-heading"><div>Raw measurements</div><span>Lower render time is better</span></div>
          <div className="raw-table">
            <div className="raw-row head"><span>Resolution</span><span>Pixels</span><span>Limit</span><span>Render time</span><span>Throughput</span></div>
            {results.map((result) => (
              <div className="raw-row" key={`raw-${result.width}-${result.iterations}`}>
                <strong>{result.width} × {result.height}</strong>
                <span>{(result.width * result.height).toLocaleString()}</span>
                <span>{result.iterations}</span>
                <span>{result.duration.toFixed(2)} ms</span>
                <span>{result.megapixelsPerSecond.toFixed(2)} MP/s</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

