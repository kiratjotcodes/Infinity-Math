import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Pocket Change is a separate app with its own test setup.
    exclude: [...configDefaults.exclude, 'pocket-change/**'],
  },
})
