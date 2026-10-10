import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'
import path from 'path'

// Preload the Latin body fonts (Barlow 400/700). Otherwise the browser only discovers them after
// downloading and parsing the main CSS, and text re-renders (and shifts) late.
function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, { bundle }) =>
        Object.keys(bundle ?? {})
          // Archivo (88 KB, headlines only) isn't preloaded: on mobile it would compete with the hero
          // image (the LCP element); headlines swap in from Helvetica once it arrives
          .filter((file) => /\/barlow-latin-(400|700)-normal-[\w-]+\.woff2$/.test(file))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head' as const,
          })),
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    compression(),
    preloadFonts(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['react-hot-toast', 'react-helmet-async', 'clsx'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
})
