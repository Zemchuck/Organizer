import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tasks': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/projects': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/habits': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/goals': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  }
})
