import { createHash, randomBytes, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { CATEGORY_IDS, LIMITS } from '../shared/types.ts'
import type {
  Attachment,
  BillCategory,
  BillionaireSession,
  NewBillInput,
  NewBillionaireInput,
  Portfolio,
  PublicBill,
  PublicBillionaire,
  Stats,
  SwipeDirection,
  SwipeOutcome,
  SwipeResult,
  UploadType,
} from '../shared/types.ts'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface BillRecord {
  id: string
  title: string
  payee: string
  amountCents: number
  dueDate: string
  category: BillCategory
  plea: string
  submitterName: string
  attachmentId: string | null
  createdAt: string
  ownerHash: string | null
  paidById: string | null
  paidAt: string | null
  sample: boolean
}

export interface BillionaireRecord {
  id: string
  name: string
  avatar: string
  wealthSource: string
  netWorthCents: number
  createdAt: string
  house: boolean
  tokenHash: string | null
}

export interface SwipeRecord {
  billionaireId: string
  billId: string
  direction: SwipeDirection
  at: string
}

export interface AttachmentRecord {
  id: string
  mime: UploadType
  size: number
  createdAt: string
  billId: string | null
}

export interface DbState {
  version: 1
  bills: BillRecord[]
  billionaires: BillionaireRecord[]
  swipes: SwipeRecord[]
  attachments: AttachmentRecord[]
}

export type SampleBillInput = Omit<NewBillInput, 'attachmentId'>

export interface StoreOptions {
  /** JSON file the state is written to after every change. Omit to keep the store in memory. */
  file?: string
  now?: () => Date
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

export function emptyState(): DbState {
  return { version: 1, bills: [], billionaires: [], swipes: [], attachments: [] }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US')}`
}

function cleanText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') throw new ApiError(400, `${field} is required.`)
  const cleaned = value
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) throw new ApiError(400, `${field} is required.`)
  if (cleaned.length > max) throw new ApiError(400, `${field} must be ${max} characters or fewer.`)
  return cleaned
}

function wholeNumber(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new ApiError(400, `${field} must be a whole number of cents.`)
  }
  if (value < min || value > max) {
    throw new ApiError(400, `${field} must be between ${dollars(min)} and ${dollars(max)}.`)
  }
  return value
}

function dueDate(value: unknown, today: Date): string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new ApiError(400, 'Due date must look like YYYY-MM-DD.')
  }
  const time = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, 'Due date is not a real date.')
  }
  if (Math.abs(time - today.getTime()) > 366 * DAY_MS) {
    throw new ApiError(400, 'Due date must be within a year of today.')
  }
  return value
}

function category(value: unknown): BillCategory {
  if (typeof value !== 'string' || !CATEGORY_IDS.includes(value as BillCategory)) {
    throw new ApiError(400, 'Pick a category for the bill.')
  }
  return value as BillCategory
}

function requireToken(token: string | undefined, message: string): string {
  if (!token || !TOKEN_PATTERN.test(token)) throw new ApiError(401, message)
  return token
}

export function createStore(state: DbState, options: StoreOptions = {}) {
  const now = options.now ?? (() => new Date())
  let lastActivity = now().getTime()

  function persist() {
    if (!options.file) return
    const temporary = `${options.file}.tmp`
    fs.writeFileSync(temporary, JSON.stringify(state))
    fs.renameSync(temporary, options.file)
  }

  function passCounts(): Map<string, number> {
    const counts = new Map<string, number>()
    for (const swipe of state.swipes) {
      if (swipe.direction === 'left') counts.set(swipe.billId, (counts.get(swipe.billId) ?? 0) + 1)
    }
    return counts
  }

  function payerTotals(): Map<string, { billsPaid: number; totalPaidCents: number }> {
    const totals = new Map<string, { billsPaid: number; totalPaidCents: number }>()
    for (const bill of state.bills) {
      if (!bill.paidById) continue
      const total = totals.get(bill.paidById) ?? { billsPaid: 0, totalPaidCents: 0 }
      total.billsPaid += 1
      total.totalPaidCents += bill.amountCents
      totals.set(bill.paidById, total)
    }
    return totals
  }

  function publicBillionaire(
    record: BillionaireRecord,
    totals = payerTotals(),
  ): PublicBillionaire {
    const total = totals.get(record.id) ?? { billsPaid: 0, totalPaidCents: 0 }
    return {
      id: record.id,
      name: record.name,
      avatar: record.avatar,
      wealthSource: record.wealthSource,
      netWorthCents: record.netWorthCents,
      createdAt: record.createdAt,
      house: record.house,
      ...total,
    }
  }

  function findAttachment(id: string | null): AttachmentRecord | undefined {
    return id ? state.attachments.find((attachment) => attachment.id === id) : undefined
  }

  function publicAttachment(id: string | null): Attachment | null {
    const record = findAttachment(id)
    return record ? { id: record.id, mime: record.mime, size: record.size } : null
  }

  function publicBill(bill: BillRecord, passes = passCounts()): PublicBill {
    const payer = bill.paidById
      ? state.billionaires.find((billionaire) => billionaire.id === bill.paidById)
      : undefined
    return {
      id: bill.id,
      title: bill.title,
      payee: bill.payee,
      amountCents: bill.amountCents,
      dueDate: bill.dueDate,
      category: bill.category,
      plea: bill.plea,
      submitterName: bill.submitterName,
      attachment: publicAttachment(bill.attachmentId),
      createdAt: bill.createdAt,
      status: bill.paidById ? 'paid' : 'open',
      paidBy:
        payer && bill.paidAt
          ? {
              billionaireId: payer.id,
              name: payer.name,
              avatar: payer.avatar,
              house: payer.house,
              at: bill.paidAt,
            }
          : null,
      passCount: passes.get(bill.id) ?? 0,
      sample: bill.sample,
    }
  }

  function publicBills(bills: BillRecord[]): PublicBill[] {
    const passes = passCounts()
    return bills.map((bill) => publicBill(bill, passes))
  }

  function billionaireForToken(token: string | undefined): BillionaireRecord {
    const valid = requireToken(token, 'Become a billionaire first.')
    const tokenHash = hashToken(valid)
    const record = state.billionaires.find((billionaire) => billionaire.tokenHash === tokenHash)
    if (!record) throw new ApiError(401, 'We could not find your billionaire profile.')
    return record
  }

  function validateBill(input: Partial<NewBillInput>): SampleBillInput {
    return {
      title: cleanText(input.title, 'What the bill is for', LIMITS.titleMax),
      payee: cleanText(input.payee, 'Who the bill is from', LIMITS.payeeMax),
      amountCents: wholeNumber(
        input.amountCents,
        'Amount',
        LIMITS.minAmountCents,
        LIMITS.maxAmountCents,
      ),
      dueDate: dueDate(input.dueDate, now()),
      category: category(input.category),
      plea: cleanText(input.plea, 'Your pitch', LIMITS.pleaMax),
      submitterName: cleanText(input.submitterName, 'Your first name', LIMITS.nameMax),
    }
  }

  function insertBill(
    fields: SampleBillInput,
    extra: Pick<BillRecord, 'attachmentId' | 'ownerHash' | 'sample'>,
  ): BillRecord {
    const bill: BillRecord = {
      id: randomUUID(),
      ...fields,
      ...extra,
      createdAt: now().toISOString(),
      paidById: null,
      paidAt: null,
    }
    state.bills.push(bill)
    return bill
  }

  /**
   * Records that a billionaire has taken a bill. A real deployment would hand off to a payment
   * provider here; Pocket Change only records the pledge.
   */
  function settle(bill: BillRecord, payer: BillionaireRecord, at: string) {
    bill.paidById = payer.id
    bill.paidAt = at
  }

  function swipeAs(
    billionaire: BillionaireRecord,
    billId: unknown,
    direction: unknown,
  ): SwipeResult {
    if (direction !== 'left' && direction !== 'right') {
      throw new ApiError(400, 'Swipe left or right. There is no up.')
    }
    const bill = typeof billId === 'string' ? state.bills.find((item) => item.id === billId) : undefined
    if (!bill) throw new ApiError(404, 'That bill has been withdrawn.')
    if (
      state.swipes.some(
        (swipe) => swipe.billionaireId === billionaire.id && swipe.billId === bill.id,
      )
    ) {
      throw new ApiError(409, 'You already swiped on this bill.')
    }

    const at = now().toISOString()
    state.swipes.push({ billionaireId: billionaire.id, billId: bill.id, direction, at })
    let outcome: SwipeOutcome
    if (direction === 'left') outcome = 'passed'
    else if (bill.paidById) outcome = 'already-paid'
    else {
      settle(bill, billionaire, at)
      outcome = 'paid'
    }
    persist()
    return { outcome, bill: publicBill(bill), billionaire: publicBillionaire(billionaire) }
  }

  return {
    now,

    /** Read-only view of the raw state, for the house billionaires' decision making. */
    read(): Readonly<DbState> {
      return state
    },

    touch() {
      lastActivity = now().getTime()
    },

    idleForMs(): number {
      return now().getTime() - lastActivity
    },

    createBillionaire(input: Partial<NewBillionaireInput>): BillionaireSession {
      const token = randomBytes(32).toString('base64url')
      const record: BillionaireRecord = {
        id: randomUUID(),
        name: cleanText(input.name, 'Your tabloid name', LIMITS.nameMax),
        avatar: cleanText(input.avatar, 'Avatar', 16),
        wealthSource: cleanText(input.wealthSource, 'Source of wealth', LIMITS.wealthSourceMax),
        netWorthCents: wholeNumber(
          input.netWorthCents,
          'Net worth',
          LIMITS.minNetWorthCents,
          LIMITS.maxNetWorthCents,
        ),
        createdAt: now().toISOString(),
        house: false,
        tokenHash: hashToken(token),
      }
      state.billionaires.push(record)
      persist()
      return { billionaire: publicBillionaire(record), token }
    },

    addHouseBillionaire(input: NewBillionaireInput): PublicBillionaire {
      const record: BillionaireRecord = {
        id: randomUUID(),
        ...input,
        createdAt: now().toISOString(),
        house: true,
        tokenHash: null,
      }
      state.billionaires.push(record)
      persist()
      return publicBillionaire(record)
    },

    billionaire(token: string | undefined): PublicBillionaire {
      return publicBillionaire(billionaireForToken(token))
    },

    deck(token: string | undefined, limit = 20): PublicBill[] {
      const me = billionaireForToken(token)
      const swiped = new Set(
        state.swipes.filter((swipe) => swipe.billionaireId === me.id).map((swipe) => swipe.billId),
      )
      const open = state.bills.filter((bill) => !bill.paidById && !swiped.has(bill.id))
      // Real people first, then the most urgent bill, then whoever has waited longest.
      open.sort(
        (a, b) =>
          Number(a.sample) - Number(b.sample) ||
          a.dueDate.localeCompare(b.dueDate) ||
          a.createdAt.localeCompare(b.createdAt),
      )
      return publicBills(open.slice(0, limit))
    },

    swipe(token: string | undefined, billId: unknown, direction: unknown): SwipeResult {
      return swipeAs(billionaireForToken(token), billId, direction)
    },

    swipeAsHouse(billionaireId: string, billId: string, direction: SwipeDirection): SwipeResult {
      const record = state.billionaires.find((billionaire) => billionaire.id === billionaireId)
      if (!record?.house) throw new ApiError(403, 'Only house billionaires swipe on autopilot.')
      return swipeAs(record, billId, direction)
    },

    portfolio(token: string | undefined): Portfolio {
      const me = billionaireForToken(token)
      const bills = state.bills
        .filter((bill) => bill.paidById === me.id)
        .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
      return { billionaire: publicBillionaire(me), bills: publicBills(bills) }
    },

    addAttachment(mime: UploadType, size: number): Attachment {
      const record: AttachmentRecord = {
        id: randomUUID(),
        mime,
        size,
        createdAt: now().toISOString(),
        billId: null,
      }
      state.attachments.push(record)
      persist()
      return { id: record.id, mime, size }
    },

    attachment(id: string): AttachmentRecord | undefined {
      return findAttachment(id)
    },

    createBill(ownerToken: string | undefined, input: Partial<NewBillInput>): PublicBill {
      const owner = requireToken(ownerToken, 'Missing your bill-owner token. Reload and try again.')
      const fields = validateBill(input)
      let attachment: AttachmentRecord | undefined
      if (input.attachmentId != null) {
        attachment =
          typeof input.attachmentId === 'string' ? findAttachment(input.attachmentId) : undefined
        if (!attachment || attachment.billId) {
          throw new ApiError(400, 'That upload is missing. Try attaching the bill again.')
        }
      }
      const bill = insertBill(fields, {
        attachmentId: attachment?.id ?? null,
        ownerHash: hashToken(owner),
        sample: false,
      })
      if (attachment) attachment.billId = bill.id
      persist()
      return publicBill(bill)
    },

    addSampleBill(input: SampleBillInput): PublicBill {
      const bill = insertBill(validateBill(input), {
        attachmentId: null,
        ownerHash: null,
        sample: true,
      })
      persist()
      return publicBill(bill)
    },

    billsFor(ownerToken: string | undefined): PublicBill[] {
      const ownerHash = hashToken(requireToken(ownerToken, 'Missing your bill-owner token.'))
      const bills = state.bills
        .filter((bill) => bill.ownerHash === ownerHash)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return publicBills(bills)
    },

    /** Removes an unpaid bill. Returns the id of its attachment so the caller can delete the file. */
    withdrawBill(ownerToken: string | undefined, billId: string): string | null {
      const ownerHash = hashToken(requireToken(ownerToken, 'Missing your bill-owner token.'))
      const bill = state.bills.find((item) => item.id === billId && item.ownerHash === ownerHash)
      if (!bill) throw new ApiError(404, 'Bill not found.')
      if (bill.paidById) throw new ApiError(409, 'This bill was already paid. No take-backs.')
      state.bills = state.bills.filter((item) => item !== bill)
      state.swipes = state.swipes.filter((swipe) => swipe.billId !== bill.id)
      state.attachments = state.attachments.filter((attachment) => attachment.billId !== bill.id)
      persist()
      return bill.attachmentId
    },

    /** Drops the oldest paid sample bills so a long-running demo doesn't grow forever. */
    pruneSampleBills(keepPaid: number) {
      const paidSamples = state.bills
        .filter((bill) => bill.sample && bill.paidById)
        .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
      const doomed = new Set(paidSamples.slice(keepPaid).map((bill) => bill.id))
      if (!doomed.size) return
      state.bills = state.bills.filter((bill) => !doomed.has(bill.id))
      state.swipes = state.swipes.filter((swipe) => !doomed.has(swipe.billId))
      persist()
    },

    stats(): Stats {
      const totals = payerTotals()
      const paid = state.bills.filter((bill) => bill.paidById)
      const leaderboard = state.billionaires
        .filter((billionaire) => totals.has(billionaire.id))
        .map((billionaire) => publicBillionaire(billionaire, totals))
        .sort((a, b) => b.totalPaidCents - a.totalPaidCents || b.billsPaid - a.billsPaid)
        .slice(0, 10)
      const recent = [...paid]
        .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
        .slice(0, 12)
        .flatMap((bill) => {
          const { paidBy } = publicBill(bill)
          return paidBy
            ? [
                {
                  billId: bill.id,
                  title: bill.title,
                  category: bill.category,
                  amountCents: bill.amountCents,
                  submitterName: bill.submitterName,
                  billionaire: paidBy,
                },
              ]
            : []
        })
      return {
        totalPaidCents: paid.reduce((sum, bill) => sum + bill.amountCents, 0),
        billsPaid: paid.length,
        openBills: state.bills.length - paid.length,
        billionaires: state.billionaires.length,
        leaderboard,
        recent,
      }
    },
  }
}

export type Store = ReturnType<typeof createStore>

/** Opens the JSON-backed store at `file`, creating it from `seed` on first run. */
export function openStore(file: string, seed: () => DbState, now?: () => Date): Store {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  let state: DbState
  if (fs.existsSync(file)) {
    state = JSON.parse(fs.readFileSync(file, 'utf8')) as DbState
  } else {
    state = seed()
    fs.writeFileSync(file, JSON.stringify(state))
  }
  return createStore(state, { file, now })
}
