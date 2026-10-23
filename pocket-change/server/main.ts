import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPocketChange, optionsFromEnv } from './app.ts'

const distDir = fileURLToPath(new URL('../dist', import.meta.url))
const port = Number(process.env.PORT ?? 8787)

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
}

const PAGE_POLICY = [
  "default-src 'self'",
  "img-src 'self' blob: data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join('; ')

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('No build found. Run `npm run build` first.')
  process.exit(1)
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end()
    return
  }
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  let file = path.join(distDir, path.normalize(decodeURIComponent(pathname)))
  if (!file.startsWith(distDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(distDir, 'index.html')
  }
  const extension = path.extname(file)
  res.setHeader('Content-Type', CONTENT_TYPES[extension] ?? 'application/octet-stream')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  if (extension === '.html') {
    res.setHeader('Content-Security-Policy', PAGE_POLICY)
    res.setHeader('Cache-Control', 'no-cache')
  } else if (pathname.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }
  if (req.method === 'HEAD') res.end()
  else fs.createReadStream(file).pipe(res)
}

const app = createPocketChange(optionsFromEnv())
const server = http.createServer((req, res) => {
  app.handleApi(req, res).then(
    (handled) => {
      if (!handled) serveStatic(req, res)
    },
    (error: unknown) => {
      console.error(error)
      if (!res.headersSent) res.writeHead(500)
      res.end()
    },
  )
})

server.listen(port, () => {
  console.log(`Pocket Change is open for business on http://localhost:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.close()
    server.close(() => process.exit(0))
  })
}
