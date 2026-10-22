import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: /api is proxied to the local backend. Production: Nginx does the same job.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:5000' } }
});
