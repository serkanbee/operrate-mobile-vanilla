/// <reference types="vitest" />

// @ts-ignore - typings resolution may not match workspace moduleResolution; runtime is fine
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  build: {
    chunkSizeWarningLimit: 1200, // quiet large-chunk warnings for legacy bundle
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('ionicons') || id.includes('@ionic')) {
              return 'vendor-react-ionic';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
