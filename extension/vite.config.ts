import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content_script: resolve(__dirname, 'src/content/index.ts'),
        universal_scraper: resolve(__dirname, 'src/content/universal_realtime_scraper.ts')
      },
      output: {
        entryFileNames: '[name].js'
      }
    },
    outDir: 'dist',
  },
});
