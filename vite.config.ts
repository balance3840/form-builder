import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { localeChunk } from './src/i18n/chunks';

export default defineConfig({
  plugins: [preact()],
  resolve: { dedupe: ['preact'] },
  // @restrella/form-generator is linked from ../form-generator during development
  server: { fs: { allow: ['..'] } },
  build: { rollupOptions: { output: { manualChunks: localeChunk } } },
});
