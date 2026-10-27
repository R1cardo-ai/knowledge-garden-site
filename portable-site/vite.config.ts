import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

export default defineConfig({
  root: path.join(projectRoot, 'portable-site'),
  publicDir: path.join(projectRoot, 'public'),
  base: './',
  resolve: { alias: { '@': projectRoot } },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  build: { outDir: path.join(projectRoot, 'portable-site-dist'), assetsDir: '.', emptyOutDir: true },
});
