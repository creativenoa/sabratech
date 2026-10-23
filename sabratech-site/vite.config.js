import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /neon-auth is proxied so the auth cookie is first-party in dev too
// (production has the same proxy as a rewrite in vercel.json).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@remix-run)\//.test(id)) return 'react-vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/neon-auth': {
        target: 'https://ep-weathered-feather-axceeqgo.neonauth.c-4.us-east-2.aws.neon.tech/neondb/auth',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/neon-auth/, ''),
      },
    },
  },
})
