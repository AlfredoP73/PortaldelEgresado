import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react'
            }
          }
        },
      },
    },
  },
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
