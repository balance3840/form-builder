import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { localeChunk } from './src/i18n/chunks';

// Library build: `npm run build:lib` -> dist-lib/form-builder.js (the CSS is inside it: the builder draws in a shadow root). Preact is bundled in,
// the form generator stays an external (peer) dependency so the host app and the builder share one copy.
export default defineConfig({
  plugins: [preact()],
  resolve: { dedupe: ['preact'] },
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: { entry: 'src/lib.tsx', formats: ['es'], fileName: () => 'form-builder.js' },
    rollupOptions: {
      external: [/^@restrella\/form-generator/],
      output: { assetFileNames: 'form-builder[extname]', manualChunks: localeChunk },
    },
  },
});
