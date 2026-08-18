import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';

// Build an entry point for every HTML file in the project root
const htmlFiles = readdirSync('.').filter((f) => f.endsWith('.html'));

const input = Object.fromEntries(
  htmlFiles.map((file) => [file.replace('.html', ''), resolve(__dirname, file)])
);

export default defineConfig({
  root: '.',
  publicDir: './',
  build: {
    rollupOptions: {
      input,
    },
  },
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
});
