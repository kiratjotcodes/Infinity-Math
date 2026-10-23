import { useEffect, useState } from 'react'

export interface Route {
  path: string
  params: URLSearchParams
}

function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const update = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}

export const href = (path: string) => `#${path}`

export function navigate(path: string) {
  window.location.hash = path
}
