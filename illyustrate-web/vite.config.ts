import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
      '@domain': '/src/domain',
      '@application': '/src/application',
      '@infrastructure': '/src/infrastructure',
      '@presentation': '/src/presentation',
      '@features': '/src/features',
      '@shared': '/src/shared',
    },
  },
  build: {
    // Optimize build for faster loading
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Split chunks for better caching
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor'
            }
            if (id.includes('lucide')) {
              return 'ui'
            }
            if (id.includes('zustand')) {
              return 'state'
            }
            if (id.includes('cytoscape')) {
              return 'graph'
            }
            return 'vendor'
          }
        },
      },
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  server: {
    // Faster dev server startup
    preTransformRequests: true,
  },
  optimizeDeps: {
    // Pre-bundle these dependencies for faster dev loading
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'cytoscape',
      'axios',
    ],
  },
})
