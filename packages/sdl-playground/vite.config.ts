import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@arch0/sdl'],
  },
  build: {
    commonjsOptions: {
      include: [/@arch0\/sdl/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
})
