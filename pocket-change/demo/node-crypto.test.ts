import { describe, expect, it } from 'vitest'
import { createHash, randomBytes, randomUUID } from './node-crypto'

describe('demo node:crypto stand-ins', () => {
  it('makes v4 UUIDs the upload and bill routes accept', () => {
    const id = randomUUID()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(randomUUID()).not.toBe(id)
  })

  it('makes tokens the store accepts', () => {
    expect(randomBytes(32).toString()).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('hashes deterministically', () => {
    const hash = (value: string) => createHash().update(value).digest()
    expect(hash('token-a')).toBe(hash('token-a'))
    expect(hash('token-a')).not.toBe(hash('token-b'))
    expect(hash('token-a')).toMatch(/^[0-9a-f]{28}$/)
  })
})
