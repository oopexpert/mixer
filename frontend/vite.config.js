import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendTarget = 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js'
  },
  server: {
    proxy: {
      '/admin': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/user': {
        target: backendTarget,
        changeOrigin: true,
      },
    }
  }
})
