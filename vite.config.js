import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sakuPwa } from './pwa/vite-plugin-pwa.js';

// Alamat folder aplikasi saat online. GitHub Pages: /Coba-coba/.
// Untuk hosting di root domain (mis. Vercel/Netlify), jalankan build dengan BASE_PATH=/
const BASE = process.env.BASE_PATH || '/Coba-coba/';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react(), sakuPwa()],
  base: command === 'build' || isPreview ? BASE : '/',
  test: {
    environment: 'node',
  },
}));
