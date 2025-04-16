import { defineConfig } from 'vite';
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
    port: 3000,
  },
  mode: 'production',
  build: {
    target: 'es2022',
    rollupOptions: {
      external: ['d3'], // <-- this line makes d3 external
    },
  },
});
