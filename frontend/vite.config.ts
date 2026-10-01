import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    host: true,
    allowedHosts: true,
    hmr: {
      clientPort: 80,
    },
    proxy: {
      '/api/auth': {
        target: 'http://auth:8000',
        changeOrigin: true,
      },
      '/api/modulo1': {
        target: 'http://graduates:8000',
        changeOrigin: true,
      },
      '/api/modulo2': {
        target: 'http://companies:8000',
        changeOrigin: true,
      },
      '/matching': {
        target: 'http://matchmaking:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://dashboard:8000',
        changeOrigin: true,
      }
    }
  },
})