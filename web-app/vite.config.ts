/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk - React and routing (rarely changes)
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Charts chunk - Recharts is heavy, load separately
          charts: ['recharts'],
        }
      }
    },
    // Increase chunk size warning limit since we're splitting
    chunkSizeWarningLimit: 300
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
})

