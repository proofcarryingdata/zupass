import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  // This is needed because qr-image relies on it being here
  // https://github.com/alexeyten/qr-image/issues/13#issuecomment-421289572
  plugins: [react(), nodePolyfills({
    include: ["process"],
    globals: {
      process: true
    }
  })],
})
