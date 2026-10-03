import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Acupuncture/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        root: 'index.html',
        ru: 'ru/index.html',
        zh: 'zh/index.html',
        en: 'en/index.html',
      },
    },
  },
})
