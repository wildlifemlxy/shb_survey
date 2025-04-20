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
        // Allow caching files up to 5MB (default is 2MB)
        maximumFileSizeToCacheInBytes: 1024 * 1024 * 1024,
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
  },
  server: {
    port: 3000,
  },
  mode: 'production',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000, // Optional: suppress large chunk warnings
    rollupOptions: {
      output: {
        manualChunks: {
          lodash: ['lodash'],
        },
      },
    },
  },
});
