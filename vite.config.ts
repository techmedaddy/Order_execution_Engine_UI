import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const API_BASE_URL =
    env.VITE_API_BASE_URL || 'http://localhost:7542';

  return {
    server: {
      port: 3234,
      host: '0.0.0.0',
      cors: {
        origin: API_BASE_URL,
        credentials: true,
      },
    },

    plugins: [react()],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.API_BASE_URL': JSON.stringify(API_BASE_URL),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
