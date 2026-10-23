import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { LIMITS, TOKEN_HEADER } from '../shared/types.ts'
import type { Attachment, BillionaireSession, PublicBill, SwipeResult } from '../shared/types.ts'
import { createApi } from './api.ts'
import { createStore, emptyState } from './store.ts'
import { createUploadFolder, sniffUploadType } from './uploads.ts'

const OWNER = 'owner-token-'.padEnd(48, 'x')
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])

let dir: string
let server: http.Server
let base: string

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pocket-change-api-'))
  const handleApi = createApi(createStore(emptyState()), createUploadFolder(dir))
  server = http.createServer((req, res) => {
    handleApi(req, res).then((handled) => {
      if (!handled) res.writeHead(418).end()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  fs.rmSync(dir, { recursive: true, force: true })
})

async function call<T>(
  method: string,
  route: string,
  options: { token?: string; json?: unknown; body?: Uint8Array } = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = {}
  if (options.token) headers[TOKEN_HEADER] = options.token
  if (options.json !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  })
  const text = await response.text()
  return { status: response.status, body: (text ? JSON.parse(text) : null) as T }
}

describe('sniffUploadType', () => {
  it('trusts bytes, not file names', () => {
    expect(sniffUploadType(JPEG)).toBe('image/jpeg')
    expect(sniffUploadType(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf')
    expect(sniffUploadType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp')
    expect(sniffUploadType(Buffer.from('<svg onload="alert(1)">'))).toBeNull()
  })
})

describe('Pocket Change API', () => {
  it('takes a bill from upload to paid', async () => {
    const upload = await call<Attachment>('POST', '/uploads', { body: JPEG })
    expect(upload.status).toBe(201)
    expect(upload.body.mime).toBe('image/jpeg')

    const file = await fetch(`${base}/api/uploads/${upload.body.id}`)
    expect(file.headers.get('content-type')).toBe('image/jpeg')
    expect(Buffer.from(await file.arrayBuffer())).toEqual(JPEG)

    const created = await call<PublicBill>('POST', '/bills', {
      token: OWNER,
      json: {
        title: 'Water bill',
        payee: 'City Water',
        amountCents: 5_812,
        dueDate: new Date().toISOString().slice(0, 10),
        category: 'utilities',
        plea: 'I drink a reasonable amount of water.',
        submitterName: 'Noor',
        attachmentId: upload.body.id,
      },
    })
    expect(created.status).toBe(201)

    const session = await call<BillionaireSession>('POST', '/billionaires', {
      json: {
        name: 'Test Tycoon',
        avatar: '🎩',
        wealthSource: 'Yachts, mostly',
        netWorthCents: LIMITS.minNetWorthCents,
      },
    })
    expect(session.status).toBe(201)
    const { token } = session.body

    const deck = await call<PublicBill[]>('GET', '/deck', { token })
    expect(deck.body.map((item) => item.id)).toContain(created.body.id)

    const swipe = await call<SwipeResult>('POST', '/swipes', {
      token,
      json: { billId: created.body.id, direction: 'right' },
    })
    expect(swipe.body.outcome).toBe('paid')

    const mine = await call<PublicBill[]>('GET', '/bills/mine', { token: OWNER })
    expect(mine.body[0]).toMatchObject({ status: 'paid', paidBy: { name: 'Test Tycoon' } })

    const stats = await call<{ billsPaid: number }>('GET', '/stats')
    expect(stats.body.billsPaid).toBe(1)
  })

  it('withdraws an unpaid bill and deletes its upload', async () => {
    const upload = await call<Attachment>('POST', '/uploads', { body: Buffer.from('%PDF-1.4 bill') })
    const created = await call<PublicBill>('POST', '/bills', {
      token: OWNER,
      json: {
        title: 'Gas',
        payee: 'Gas Co',
        amountCents: 9_000,
        dueDate: new Date().toISOString().slice(0, 10),
        category: 'utilities',
        plea: 'Brr.',
        submitterName: 'Chloe',
        attachmentId: upload.body.id,
      },
    })
    expect((await call('DELETE', `/bills/${created.body.id}`, { token: OWNER })).status).toBe(204)
    expect(fs.existsSync(path.join(dir, upload.body.id))).toBe(false)
    expect((await fetch(`${base}/api/uploads/${upload.body.id}`)).status).toBe(404)
  })

  it('turns away bad requests politely', async () => {
    expect((await call('GET', '/deck')).status).toBe(401)
    expect((await call('GET', '/nope')).status).toBe(404)
    expect((await call('POST', '/uploads', { body: Buffer.from('GIF89a') })).status).toBe(415)
    expect((await call('POST', '/uploads', { body: new Uint8Array() })).status).toBe(400)
    const huge = new Uint8Array(LIMITS.uploadMaxBytes + 1)
    huge.set(JPEG)
    expect((await call('POST', '/uploads', { body: huge })).status).toBe(413)

    const response = await fetch(`${base}/api/billionaires`, { method: 'POST', body: '{nope' })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Expected a JSON object.' })
    expect((await fetch(`${base}/elsewhere`)).status).toBe(418)
  })
})
