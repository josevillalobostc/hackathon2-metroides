import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://hackaton-20261-front-587720740455.us-east1.run.app',
        changeOrigin: true,
      }
    }
  }
})
