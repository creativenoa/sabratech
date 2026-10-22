import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /neon-auth is proxied so the auth cookie is first-party in dev too
// (production has the same proxy as a rewrite in vercel.json).
export default defineConfig({
  plugins: [react()],
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
