import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @mediapipe/pose viene como UMD; MoveNet no lo necesita (ver shim en src/services).
      '@mediapipe/pose': fileURLToPath(new URL('./src/services/mediapipePoseShim.js', import.meta.url)),
    },
  },
  server: {
    // El frontend llama a /api en el mismo origen y Vite lo reenvia al servidor.
    proxy: { '/api': 'http://localhost:3001' },
  },
})
