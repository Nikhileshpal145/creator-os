import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content_script: resolve(__dirname, 'src/content/index.ts'),
        universal_scraper: resolve(__dirname, 'src/content/universal_realtime_scraper.ts'),
        // Voice overlay removed - content scripts can't use ES modules
        // The voice assistant is still available in the extension popup
      },
      output: {
        entryFileNames: '[name].js',
      }
    },
    outDir: 'dist',
  },
});
