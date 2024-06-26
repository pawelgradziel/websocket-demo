import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    strictPort: true,
    // if you're using windows and hot reload doesn't work
     watch: {
       usePolling: true
     }
  },
})
