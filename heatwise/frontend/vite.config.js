import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/summary': 'http://localhost:8000',
      '/simulate': 'http://localhost:8000',
      '/optimize': 'http://localhost:8000',
      '/insight': 'http://localhost:8000',
      '/data': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
  },
})
