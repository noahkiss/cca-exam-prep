import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Static SPA for the CCA-F exam prep app. Served in production by a Cloudflare
// Worker with SPA fallback, so client-side routing must resolve from any path.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Pinned per AGENTS.md — do not use Vite's default 5173.
    port: 5837,
    strictPort: true,
  },
  preview: {
    port: 5837,
    strictPort: true,
  },
  build: {
    // `content-questions` is a single JSON module (~540 kB), so Rollup cannot
    // split it and no amount of chunking will bring it under the 500 kB
    // default. It is lazy — nothing on the landing path pulls it — so the
    // ceiling is raised just enough to clear it while still catching a *code*
    // chunk ballooning (the largest of those is React, at ~194 kB). Raise this
    // again as the bank grows, or split data/questions.json if it gets unwieldy.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Content and framework are pinned to their own chunks so they cache
        // independently of app code: editing a page must not invalidate the
        // ~680 kB question/module banks, and editing content must not
        // invalidate React.
        manualChunks(id) {
          if (id.includes('/data/questions.json')) return 'content-questions';
          if (id.includes('/data/modules.json')) return 'content-modules';
          if (id.includes('/node_modules/react-router')) return 'vendor-router';
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
        },
      },
    },
  },
});
