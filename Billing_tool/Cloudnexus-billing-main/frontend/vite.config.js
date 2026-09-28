import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/billing/',
  server: {
    port: 3008,
    strictPort: true,
    host: true,
    allowedHosts: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
    proxy: {
      // Billing-specific data calls (built via getApiBase() as /billing/api/...) —
      // forward as-is so the backend's /billing/* handler relays them to the Python service.
      '/billing/api': { target: 'http://localhost:3001', changeOrigin: true },
      // Platform-level routes (session-check, activity log, photo, etc.) — straight to
      // the Node backend, unrewritten. Previously this rewrote to /billing/api/*, which
      // misrouted these into the Python billing backend and caused false "Account Removed".
      '/api':       { target: 'http://localhost:3001', changeOrigin: true },
      '/auth':      { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
    },
  },
});
