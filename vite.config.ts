import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration for Order Execution Engine UI
 * 
 * Environment variables starting with VITE_ are automatically exposed to the client.
 * - VITE_API_BASE_URL is defined in .env (local) or .env.docker (Docker)
 * - Do NOT hardcode backend URLs here
 */
export default defineConfig({
  server: {
    port: 3234,
    host: '0.0.0.0',
  },

  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
