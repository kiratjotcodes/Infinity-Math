import path from 'node:path'
import { createApi } from './api.ts'
import { startHouseBillionaires } from './house.ts'
import { seedState } from './seed.ts'
import { openStore } from './store.ts'
import { createUploadFolder } from './uploads.ts'

export interface AppOptions {
  dataDir: string
  houseBillionaires: boolean
}

export function optionsFromEnv(env: NodeJS.ProcessEnv = process.env): AppOptions {
  return {
    dataDir: path.resolve(env.DATA_DIR ?? 'data'),
    houseBillionaires: env.HOUSE_BILLIONAIRES !== 'off',
  }
}

/** Wires the store, uploads, API and house billionaires together. Used by `vite` and `npm start`. */
export function createPocketChange(options: AppOptions) {
  const store = openStore(path.join(options.dataDir, 'db.json'), () => seedState())
  const uploads = createUploadFolder(path.join(options.dataDir, 'uploads'))
  const handleApi = createApi(store, uploads)
  const stopHouse = options.houseBillionaires ? startHouseBillionaires(store) : () => {}
  return { store, handleApi, close: stopHouse }
}
