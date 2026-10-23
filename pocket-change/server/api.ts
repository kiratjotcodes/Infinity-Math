import type { IncomingMessage, ServerResponse } from 'node:http'
import { LIMITS, TOKEN_HEADER } from '../shared/types.ts'
import { ApiError } from './store.ts'
import type { Store } from './store.ts'
import { sniffUploadType } from './uploads.ts'
import type { UploadFolder } from './uploads.ts'

const JSON_LIMIT_BYTES = 16 * 1024

type Reply =
  | { status: number; json?: unknown }
  | { status: number; bytes: Buffer; mime: string }

function readBody(req: IncomingMessage, limit: number, tooLarge: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length'] ?? 0) > limit) {
      req.resume()
      reject(new ApiError(413, tooLarge))
      return
    }
    const chunks: Buffer[] = []
    let size = 0
    let overflowed = false
    req.on('data', (chunk: Buffer) => {
      if (overflowed) return
      size += chunk.length
      if (size > limit) {
        overflowed = true
        chunks.length = 0
        reject(new ApiError(413, tooLarge))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!overflowed) resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBody(req, JSON_LIMIT_BYTES, 'That request is too large.')
  try {
    const parsed: unknown = JSON.parse(body.toString('utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // Fall through to the error below.
  }
  throw new ApiError(400, 'Expected a JSON object.')
}

export function createApi(store: Store, uploads: UploadFolder) {
  async function route(req: IncomingMessage, pathname: string): Promise<Reply> {
    const method = req.method ?? 'GET'
    const rawToken = req.headers[TOKEN_HEADER]
    const token = typeof rawToken === 'string' ? rawToken : undefined

    if (method === 'GET' && pathname === '/stats') return { status: 200, json: store.stats() }

    if (method === 'POST' && pathname === '/billionaires') {
      return { status: 201, json: store.createBillionaire(await readJson(req)) }
    }
    if (method === 'GET' && pathname === '/billionaires/me') {
      return { status: 200, json: store.billionaire(token) }
    }
    if (method === 'GET' && pathname === '/deck') return { status: 200, json: store.deck(token) }
    if (method === 'POST' && pathname === '/swipes') {
      const body = await readJson(req)
      return { status: 200, json: store.swipe(token, body.billId, body.direction) }
    }
    if (method === 'GET' && pathname === '/portfolio') {
      return { status: 200, json: store.portfolio(token) }
    }

    if (method === 'POST' && pathname === '/uploads') {
      const megabytes = LIMITS.uploadMaxBytes / 1024 / 1024
      const bytes = await readBody(
        req,
        LIMITS.uploadMaxBytes,
        `Bills must be ${megabytes} MB or smaller.`,
      )
      if (!bytes.length) throw new ApiError(400, 'That file is empty.')
      const mime = sniffUploadType(bytes)
      if (!mime) throw new ApiError(415, 'Upload a photo (JPEG, PNG, WebP) or a PDF of the bill.')
      const attachment = store.addAttachment(mime, bytes.length)
      uploads.write(attachment.id, bytes)
      return { status: 201, json: attachment }
    }
    const upload = /^\/uploads\/([0-9a-f-]{36})$/.exec(pathname)
    if (method === 'GET' && upload) {
      const record = store.attachment(upload[1])
      const bytes = record ? uploads.read(record.id) : null
      if (!record || !bytes) throw new ApiError(404, 'That file is gone.')
      return { status: 200, bytes, mime: record.mime }
    }

    if (method === 'POST' && pathname === '/bills') {
      return { status: 201, json: store.createBill(token, await readJson(req)) }
    }
    if (method === 'GET' && pathname === '/bills/mine') {
      return { status: 200, json: store.billsFor(token) }
    }
    const bill = /^\/bills\/([0-9a-f-]{36})$/.exec(pathname)
    if (method === 'DELETE' && bill) {
      const attachmentId = store.withdrawBill(token, bill[1])
      if (attachmentId) uploads.remove(attachmentId)
      return { status: 204 }
    }

    throw new ApiError(404, 'No such endpoint.')
  }

  /** Handles `/api/*` requests. Resolves to false for anything else so the caller can move on. */
  return async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost')
    if (!pathname.startsWith('/api/')) return false
    store.touch()

    let reply: Reply
    try {
      reply = await route(req, pathname.slice('/api'.length))
    } catch (error) {
      if (error instanceof ApiError) {
        reply = { status: error.status, json: { error: error.message } }
      } else {
        console.error(error)
        reply = { status: 500, json: { error: 'Something went wrong at the bank. Try again.' } }
      }
    }

    res.statusCode = reply.status
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if ('bytes' in reply) {
      res.setHeader('Content-Type', reply.mime)
      res.setHeader('Cache-Control', 'private, max-age=86400, immutable')
      if (reply.mime !== 'application/pdf') {
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
      }
      res.end(reply.bytes)
    } else if (reply.json === undefined) {
      res.end()
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify(reply.json))
    }
    return true
  }
}

export type ApiHandler = ReturnType<typeof createApi>
