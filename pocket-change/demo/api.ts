// The demo build swaps src/api.ts for this module: the same API, answered by the real store,
// seed data and house billionaires running inside the browser instead of on a server.
import { LIMITS, UPLOAD_TYPES } from '../shared/types'
import type {
  Attachment,
  NewBillInput,
  NewBillionaireInput,
  SwipeDirection,
  UploadType,
} from '../shared/types'
import { HOUSE_DEFAULTS, houseTick } from '../server/house.ts'
import { seedState } from '../server/seed.ts'
import { ApiError, createStore } from '../server/store.ts'
import type { DbState } from '../server/store.ts'
import { ApiRequestError } from '../src/api'

export { ApiRequestError }

const STATE_KEY = 'pocket-change.demo-state'
const UPLOAD_PREFIX = 'pocket-change.demo-upload.'

function loadState(): DbState {
  try {
    const saved = window.localStorage.getItem(STATE_KEY)
    if (saved) return JSON.parse(saved) as DbState
  } catch {
    // Storage blocked or corrupt: start a fresh world in memory.
  }
  return seedState()
}

let store = createStore(loadState())

function save() {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(store.read()))
  } catch {
    // Private browsing or a full quota: the demo keeps working for this visit.
  }
}

// Another tab of the demo changed the world.
window.addEventListener('storage', (event) => {
  if (event.key !== STATE_KEY || !event.newValue) return
  try {
    store = createStore(JSON.parse(event.newValue) as DbState)
  } catch {
    // Ignore a half-written value.
  }
})

const uploads = new Map<string, string>()

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ApiRequestError('Could not read that file.', 400))
    reader.readAsDataURL(blob)
  })
}

/** Runs one store call the way the server would, turning store errors into request errors. */
async function call<T>(run: () => T, mutates = false): Promise<T> {
  store.touch()
  try {
    const result = run()
    if (mutates) save()
    // Hand back a copy, as a network response would.
    return structuredClone(result)
  } catch (error) {
    if (error instanceof ApiError) throw new ApiRequestError(error.message, error.status)
    throw error
  }
}

export const api = {
  stats: () => call(() => store.stats()),

  createBillionaire: (input: NewBillionaireInput) => call(() => store.createBillionaire(input), true),
  me: (token: string) => call(() => store.billionaire(token)),
  deck: (token: string) => call(() => store.deck(token)),
  swipe: (token: string, billId: string, direction: SwipeDirection) =>
    call(() => store.swipe(token, billId, direction), true),
  portfolio: (token: string) => call(() => store.portfolio(token)),

  async upload(file: Blob): Promise<Attachment> {
    if (file.size > LIMITS.uploadMaxBytes) throw new ApiRequestError('Bills must be 5 MB or smaller.', 413)
    if (file.type === 'application/pdf') {
      throw new ApiRequestError('This browser demo takes photos only. The full app accepts PDFs too.', 415)
    }
    if (!UPLOAD_TYPES.includes(file.type as UploadType)) {
      throw new ApiRequestError('Upload a photo of the bill.', 415)
    }
    const dataUrl = await readAsDataUrl(file)
    const attachment = await call(() => store.addAttachment(file.type as UploadType, file.size), true)
    uploads.set(attachment.id, dataUrl)
    try {
      window.localStorage.setItem(UPLOAD_PREFIX + attachment.id, dataUrl)
    } catch {
      // Too big to keep after a reload; it still shows for this visit.
    }
    return attachment
  },
  createBill: (token: string, input: NewBillInput) => call(() => store.createBill(token, input), true),
  myBills: (token: string) => call(() => store.billsFor(token)),
  withdrawBill: (token: string, billId: string) =>
    call(() => {
      const attachmentId = store.withdrawBill(token, billId)
      if (attachmentId) {
        uploads.delete(attachmentId)
        try {
          window.localStorage.removeItem(UPLOAD_PREFIX + attachmentId)
        } catch {
          // Nothing to clean up.
        }
      }
      return null
    }, true),
}

const MISSING_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#ece3cc"/><text x="150" y="205" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#6f7a72">Photo not saved in this browser</text></svg>',
  )

export function uploadUrl(attachment: Attachment): string {
  let url = uploads.get(attachment.id)
  if (!url) {
    try {
      url = window.localStorage.getItem(UPLOAD_PREFIX + attachment.id) ?? undefined
    } catch {
      url = undefined
    }
  }
  return url ?? MISSING_IMAGE
}

// The house billionaires swipe from this tab, on the same schedule as on the server.
function scheduleHouse() {
  window.setTimeout(
    () => {
      try {
        if (store.idleForMs() < HOUSE_DEFAULTS.idleAfterMs && houseTick(store)) save()
      } catch (error) {
        console.error('House billionaire tripped over a yacht:', error)
      }
      scheduleHouse()
    },
    HOUSE_DEFAULTS.intervalMs * (0.6 + Math.random() * 0.8),
  )
}
scheduleHouse()
