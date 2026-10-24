import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const realApi = here('./src/api.ts')
const demoApi = here('./demo/api.ts')

/** Points every import of src/api.ts (except the demo's own) at the in-browser demo API. */
function demoApiPlugin(): Plugin {
  return {
    name: 'pocket-change-demo-api',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || importer === demoApi) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved?.id === realApi ? demoApi : null
    },
  }
}

/** A static build that runs the whole app, server logic included, in the browser. */
export default defineConfig({
  base: './',
  plugins: [react(), demoApiPlugin()],
  resolve: {
    alias: {
      'node:crypto': here('./demo/node-crypto.ts'),
      'node:fs': here('./demo/node-unavailable.ts'),
      'node:path': here('./demo/node-unavailable.ts'),
    },
  },
  define: {
    'import.meta.env.VITE_DEMO': JSON.stringify('true'),
  },
  build: { outDir: 'dist-demo', emptyOutDir: true },
})
