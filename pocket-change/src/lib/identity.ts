// Pocket Change has no accounts. Each browser keeps two secrets: one that owns the bills it
// uploads, and (once you go billionaire) one that signs your swipes.

const SUBMITTER_KEY = 'pocket-change.submitter-token'
const BILLIONAIRE_KEY = 'pocket-change.billionaire-token'
const NAME_KEY = 'pocket-change.first-name'

const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string | null) {
  if (value === null) memory.delete(key)
  else memory.set(key, value)
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Private browsing: the in-memory copy keeps this tab working.
  }
}

/** Random URL-safe token. Uses getRandomValues, which (unlike randomUUID) works over plain http. */
export function randomToken(bytes = 32): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
}

export function submitterToken(): string {
  let token = read(SUBMITTER_KEY)
  if (!token) {
    token = randomToken()
    write(SUBMITTER_KEY, token)
  }
  return token
}

export const billionaireToken = () => read(BILLIONAIRE_KEY)
export const saveBillionaireToken = (token: string | null) => write(BILLIONAIRE_KEY, token)

export const rememberedName = () => read(NAME_KEY) ?? ''
export const rememberName = (name: string) => write(NAME_KEY, name)
