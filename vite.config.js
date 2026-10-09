import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // path relatif supaya bisa dibuka dari subfolder, mis. GitHub Pages (/Coba-coba/)
  base: './',
  test: {
    environment: 'node',
  },
});
