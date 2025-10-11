import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  optimizeDeps: {
    include: ['@shared/data/techStackData']
  },
  server: {
    port: 5002,
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          socket: ['socket.io-client'],
          http: ['axios'],
          analytics: ['./src/services/analytics', './src/services/toast', './src/services/errorService']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}) 