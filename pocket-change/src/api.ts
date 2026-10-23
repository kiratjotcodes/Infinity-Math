import { TOKEN_HEADER } from '../shared/types'
import type {
  Attachment,
  BillionaireSession,
  NewBillInput,
  NewBillionaireInput,
  Portfolio,
  PublicBill,
  PublicBillionaire,
  Stats,
  SwipeDirection,
  SwipeResult,
} from '../shared/types'

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: { method?: string; token?: string; json?: unknown; body?: Blob } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.token) headers[TOKEN_HEADER] = options.token
  if (options.json !== undefined) headers['content-type'] = 'application/json'
  if (options.body) headers['content-type'] = options.body.type || 'application/octet-stream'

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    })
  } catch {
    throw new ApiRequestError('Could not reach the bank. Check your connection.', 0)
  }
  const text = await response.text()
  const body = text ? (JSON.parse(text) as unknown) : null
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed (${response.status}).`
    throw new ApiRequestError(message, response.status)
  }
  return body as T
}

export const api = {
  stats: () => request<Stats>('/stats'),

  createBillionaire: (input: NewBillionaireInput) =>
    request<BillionaireSession>('/billionaires', { method: 'POST', json: input }),
  me: (token: string) => request<PublicBillionaire>('/billionaires/me', { token }),
  deck: (token: string) => request<PublicBill[]>('/deck', { token }),
  swipe: (token: string, billId: string, direction: SwipeDirection) =>
    request<SwipeResult>('/swipes', { method: 'POST', token, json: { billId, direction } }),
  portfolio: (token: string) => request<Portfolio>('/portfolio', { token }),

  upload: (file: Blob) => request<Attachment>('/uploads', { method: 'POST', body: file }),
  createBill: (token: string, input: NewBillInput) =>
    request<PublicBill>('/bills', { method: 'POST', token, json: input }),
  myBills: (token: string) => request<PublicBill[]>('/bills/mine', { token }),
  withdrawBill: (token: string, billId: string) =>
    request<null>(`/bills/${billId}`, { method: 'DELETE', token }),
}

export const uploadUrl = (attachment: Attachment) => `/api/uploads/${attachment.id}`
