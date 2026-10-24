// Browser stand-ins for the parts of node:crypto that server/store.ts uses, for the demo build.

export function randomUUID(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function randomBytes(size: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return {
    toString: () =>
      btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  }
}

/**
 * In the demo every token stays in this browser, so a fast non-cryptographic hash (cyrb53, run
 * twice with different seeds) stands in for SHA-256. The real server uses node:crypto.
 */
export function createHash() {
  let input = ''
  const cyrb53 = (seed: number) => {
    let h1 = 0xdeadbeef ^ seed
    let h2 = 0x41c6ce57 ^ seed
    for (let i = 0; i < input.length; i += 1) {
      const code = input.charCodeAt(i)
      h1 = Math.imul(h1 ^ code, 2654435761)
      h2 = Math.imul(h2 ^ code, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
  }
  const hash = {
    update(value: string) {
      input += value
      return hash
    },
    digest: () => cyrb53(1) + cyrb53(2),
  }
  return hash
}
