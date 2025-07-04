import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,wasm,json,png,svg,ico}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'My React Vite PWA',
        short_name: 'ReactPWA',
        description: 'A modern PWA built with React and Vite',
        theme_color: '#3498db',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'bird-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'bird-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.json']
  },
  server: {
    port: 3000,
    host: true, // Enable access from network
    open: true, // Auto-open browser
    hmr: {
      overlay: true // Show HMR overlay on errors
    },
    watch: {
      usePolling: true, // Enable polling for file changes
      interval: 100 // Check for changes every 100ms
    }
  },
  mode: 'development', // Change to development mode for auto-refresh
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          lodash: ['lodash'],
        },
      },
    },
  },
});
