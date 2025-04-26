import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': {
        target: process.env.VITE_SERVER_URL || 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
