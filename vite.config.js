import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: '/',
  plugins: [react()],
  server: {
    port: 3006,
    strictPort: true,
    host: true,
    allowedHosts: true,
    proxy: {
      // Billing API must come before /billing to take priority
      '/billing/api': { target: 'http://localhost:3001', changeOrigin: true },
      // Billing frontend assets (trailing slash = only match /billing/... paths,
      // not the bare /billing SPA route so that F5-refresh falls through to this app)
      '/billing/':    { target: 'http://localhost:3008', changeOrigin: true },
      // Monitoring frontend assets (same rationale — /monitor/ matches tool assets,
      // /monitoring SPA route is not caught by this proxy)
      '/monitor/':    { target: 'http://localhost:3007', changeOrigin: true },
      // Shared backend routes
      '/api':         { target: 'http://localhost:3001', changeOrigin: true },
      '/auth':        { target: 'http://localhost:3001', changeOrigin: true },
      '/health':      { target: 'http://localhost:3001', changeOrigin: true },
      // Only proxy actual API calls under /superadmin/...  — bare /superadmin
      // is the SPA's own super-admin portal route (Ctrl+Shift+K), and must
      // fall through to Vite's SPA fallback so a hard refresh doesn't 404.
      '^/superadmin/.+': { target: 'http://localhost:3001', changeOrigin: true },
      // Activation API sub-routes go to backend; bare /activate goes to SPA.
      '^/activate/.+':   { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io':   { target: 'http://localhost:3001', ws: true, changeOrigin: true },
    },
  },
}))
