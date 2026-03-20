import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Required for Electron file:// loading in packaged builds.
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    host: true,
  },
});
