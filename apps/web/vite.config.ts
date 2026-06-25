import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [tanstackRouter(), tailwindcss(), react()],
  build: {
    // shiki's language grammars and oniguruma WASM are all lazy-loaded chunks.
    // They are only downloaded when a user views code in that specific language.
    // Setting 1 MB threshold to avoid noise in CI output for these known large assets.
    chunkSizeWarningLimit: 1024,
  },
});
