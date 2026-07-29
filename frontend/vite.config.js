import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolve @tinymce/tinymce-react and its peer dep prop-types
    // from the monorepo root node_modules (packages are installed there, not in /frontend)
    alias: {
      '@tinymce/tinymce-react': path.resolve(
        __dirname,
        '../node_modules/@tinymce/tinymce-react'
      ),
      'prop-types': path.resolve(
        __dirname,
        '../node_modules/prop-types'
      ),
    },
  },
  optimizeDeps: {
    // Pre-bundle @tinymce/tinymce-react (and its CJS deps) so it works in ESM mode
    include: ['@tinymce/tinymce-react'],
    rolldownOptions: {
      resolve: {
        // Also look in root node_modules for transitive deps
        modules: [
          path.resolve(__dirname, '../node_modules'),
          path.resolve(__dirname, 'node_modules'),
        ],
      },
    },
  },
})
