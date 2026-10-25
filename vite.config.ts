import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Allow any preview/proxy host (e.g. *.e2b.app live preview) to reach the dev server
  server: {
    allowedHosts: true
  }
})
