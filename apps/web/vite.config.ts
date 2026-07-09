import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The web app talks to the API under /api/v1. In dev, proxy it to the local API (or the
// contract mock). In production the reverse proxy (nginx) serves both under one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4300,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
