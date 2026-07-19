import { useMemo, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { EducationPage } from './components/EducationPage'
import { FractalCanvas } from './components/FractalCanvas'
import { OrbitInspector } from './components/OrbitInspector'
import { PerformancePage } from './components/PerformancePage'
import {
  calculateOrbit,
  DEFAULT_JULIA_VIEW,
  DEFAULT_MANDELBROT_VIEW,
  type Complex,
  type FractalMode,
  type Viewport,
} from './lib/fractal'

type Page = 'explore' | 'learn' | 'performance'

function IteraMark() {
  return (
    <div className="itera-mark" aria-hidden="true">
      <span className="mark-orbit orbit-a" /><span className="mark-orbit orbit-b" /><i />
    </div>
  )
}

function App() {
  const [page, setPage] = useState<Page>('explore')
  const [mode, setMode] = useState<FractalMode>('mandelbrot')
  const [maxIterations, setMaxIterations] = useState(300)
  const [juliaC, setJuliaC] = useState<Complex>({ re: -0.8, im: 0.156 })
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_MANDELBROT_VIEW)
  const [selectedPoint, setSelectedPoint] = useState<Complex | null>(null)

  const orbit = useMemo(() => {
    if (!selectedPoint) return null
    return mode === 'mandelbrot'
      ? calculateOrbit({ re: 0, im: 0 }, selectedPoint, maxIterations)
      : calculateOrbit(selectedPoint, juliaC, maxIterations)
  }, [juliaC, maxIterations, mode, selectedPoint])

  const changeMode = (nextMode: FractalMode) => {
    setMode(nextMode)
    setViewport(nextMode === 'mandelbrot' ? DEFAULT_MANDELBROT_VIEW : DEFAULT_JULIA_VIEW)
    setSelectedPoint(null)
  }

  const resetView = () => {
    setViewport(mode === 'mandelbrot' ? DEFAULT_MANDELBROT_VIEW : DEFAULT_JULIA_VIEW)
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => setPage('explore')} aria-label="Itera home">
          <IteraMark />
          <span><strong>itera</strong><small>COMPLEX DYNAMICS LAB</small></span>
        </button>
        <nav className="main-nav" aria-label="Primary navigation">
          <button className={page === 'explore' ? 'active' : ''} onClick={() => setPage('explore')}>Explore</button>
          <button className={page === 'learn' ? 'active' : ''} onClick={() => setPage('learn')}>The mathematics</button>
          <button className={page === 'performance' ? 'active' : ''} onClick={() => setPage('performance')}>Performance lab</button>
        </nav>
        <button className="header-action" onClick={() => setPage(page === 'learn' ? 'explore' : 'learn')}>
          {page === 'learn' ? 'Open explorer' : 'How it works'}
          <span>↗</span>
        </button>
      </header>

      {page === 'explore' && (
        <main className="explore-page">
          <section className="explore-intro">
            <div>
              <p className="eyebrow">Live computation · zₙ₊₁ = zₙ² + c</p>
              <h1>Explore an infinite boundary.</h1>
            </div>
            <p>Scroll to zoom, drag to navigate, then select any point to reveal the orbit behind the pixel.</p>
          </section>

          <div className="explorer-grid">
            <FractalCanvas
              mode={mode}
              maxIterations={maxIterations}
              juliaC={juliaC}
              viewport={viewport}
              selectedPoint={selectedPoint}
              onViewportChange={setViewport}
              onPointSelect={setSelectedPoint}
            />
            <ControlPanel
              mode={mode}
              maxIterations={maxIterations}
              juliaC={juliaC}
              viewport={viewport}
              onModeChange={changeMode}
              onIterationsChange={setMaxIterations}
              onJuliaChange={setJuliaC}
              onResetView={resetView}
            />
          </div>

          <OrbitInspector selectedPoint={selectedPoint} mode={mode} juliaC={juliaC} orbit={orbit} />
        </main>
      )}
      {page === 'learn' && <EducationPage />}
      {page === 'performance' && <PerformancePage />}

      <footer className="app-footer">
        <span><IteraMark /> Itera</span>
        <p>Mathematics is not only something to solve. It is something to explore.</p>
        <small>Built with TypeScript · Canvas · Web Workers</small>
      </footer>
    </div>
  )
}

export default App
