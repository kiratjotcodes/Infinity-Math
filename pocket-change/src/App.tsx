import { FeedbackProvider } from './components/Feedback'
import { Landing } from './components/Landing'
import { Leaderboard } from './components/Leaderboard'
import { MyBills } from './components/MyBills'
import { PortfolioPage } from './components/Portfolio'
import { SubmitBill } from './components/SubmitBill'
import { Vault } from './components/Vault'
import { href, useRoute } from './lib/router'

const NAV = [
  { path: '/bills', label: 'My bills' },
  { path: '/billions', label: 'Swipe' },
  { path: '/leaderboard', label: 'Leaderboard' },
]

function Page({ path, params }: { path: string; params: URLSearchParams }) {
  switch (path) {
    case '/':
      return <Landing />
    case '/bills':
      return <MyBills highlight={params.get('new')} />
    case '/bills/new':
      return <SubmitBill />
    case '/billions':
      return <Vault />
    case '/billions/portfolio':
      return <PortfolioPage />
    case '/leaderboard':
      return <Leaderboard />
    default:
      return (
        <div className="page page-message">
          <p>This page has been repossessed.</p>
          <a className="button button--money" href={href('/')}>
            Go home
          </a>
        </div>
      )
  }
}

export default function App() {
  const { path, params } = useRoute()
  const vault = path.startsWith('/billions')

  return (
    <FeedbackProvider>
      <div className={vault ? 'app app--vault' : 'app'}>
        <header className="site-header">
          <a className="brand" href={href('/')}>
            <span className="brand__coin" aria-hidden="true">
              ¢
            </span>
            <span className="brand__name">Pocket Change</span>
          </a>
          <nav className="site-nav" aria-label="Main">
            {NAV.map((item) => {
              const active = path === item.path || path.startsWith(`${item.path}/`)
              return (
                <a key={item.path} href={href(item.path)} aria-current={active ? 'page' : undefined}>
                  {item.label}
                </a>
              )
            })}
          </nav>
        </header>
        <main className="main">
          <Page key={path} path={path} params={params} />
        </main>
        <footer className="site-footer">
          <p>
            Pocket Change is a parody demo: no real money moves, billionaires are on the honor
            system, and “House” billionaires are simulated to keep things lively.
          </p>
          <p>Always black out account numbers before sharing a bill with anyone, rich or otherwise.</p>
        </footer>
      </div>
    </FeedbackProvider>
  )
}
