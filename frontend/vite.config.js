import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import viteCompression from 'vite-plugin-compression'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    babel({
      presets: [reactCompilerPreset()],
      exclude: 'node_modules/**'
    }),
    react(),
     tailwindcss(),
     viteCompression({
       algorithm: 'gzip',
       ext: '.gz',
     }),
     viteCompression({
       algorithm: 'brotliCompress',
       ext: '.br',
     })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('sonner')) {
              return 'vendor-ui';
            }
            if (id.includes('axios') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-utils';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
