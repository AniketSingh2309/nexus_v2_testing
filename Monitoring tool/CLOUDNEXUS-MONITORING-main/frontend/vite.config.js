import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/monitor/',
  server: {
    port: 3007,
    strictPort: true,
    host: true,
    allowedHosts: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
    proxy: {
      '/api':       { target: 'http://localhost:3001', changeOrigin: true },
      '/auth':      { target: 'http://localhost:3001', changeOrigin: true },
      '/health':    { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
    },
  },
});
