// The demo build never touches the file system; server/store.ts only needs these imports to resolve.
const unavailable = () => {
  throw new Error('The browser demo has no file system.')
}

export default new Proxy({}, { get: () => unavailable })
