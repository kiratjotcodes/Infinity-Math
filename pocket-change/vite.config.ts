import { defineConfig } from 'vite'
import type { Connect, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createPocketChange, optionsFromEnv } from './server/app.ts'

/** Serves the Pocket Change API from the Vite dev and preview servers. */
function pocketChangeApi(): Plugin {
  let app: ReturnType<typeof createPocketChange> | undefined
  const mount = ({ middlewares }: { middlewares: Connect.Server }) => {
    app ??= createPocketChange(optionsFromEnv())
    const { handleApi } = app
    middlewares.use((req, res, next) => {
      handleApi(req, res).then((handled) => {
        if (!handled) next()
      }, next)
    })
  }
  return { name: 'pocket-change-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), pocketChangeApi()],
})
