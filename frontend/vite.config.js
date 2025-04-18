import { defineConfig } from 'vite';  // Correct import for defineConfig
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,  // Set port to 3000
  },
  mode: 'production',
  build: {
    target: 'es2022',  // or 'esnext' for the latest features
    rollupOptions: {
      output: {
        manualChunks: {
          lodash: ['lodash'],
        },
      },
    },
  },
});
